from io import BytesIO

import PyPDF2
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from google import genai
from google.genai import types
import chromadb
import os
import json
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from bson import ObjectId
import requests
import time

load_dotenv()

app = FastAPI()

# Connect Python directly to your MongoDB instance
mongo_client = MongoClient(os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017"))
db = mongo_client["test"] # Use your actual DB name

# Allow Node.js backend and React frontend to communicate with this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set in the .env file")
    
client = genai.Client(api_key=GEMINI_API_KEY)

# Initialize ChromaDB (Local Vector Database)
# Because we do not specify an embedding_function, Chroma automatically 
# uses its default sentence-transformers model (all-MiniLM-L6-v2)
chroma_client = chromadb.PersistentClient(path="./chroma_data")
collection = chroma_client.get_or_create_collection(name="resumes_collection")

class ResumePayload(BaseModel):
    applicant_id: str
    job_id: str
    resume_text: str

class ProcessApplicationPayload(BaseModel):
    application_id: str
    applicant_id: str
    job_id: str
    resume_url: str
    resume_text: str = ""  # <-- Accept cached text
    job_description: str

class SearchPayload(BaseModel):
    job_id: str
    query: str
    top_k: int = 5

class AnalyzePayload(BaseModel):
    resume_text: str
    job_description: str

class Message(BaseModel):
    role: str
    content: str

class ChatPayload(BaseModel):
    job_id: str
    messages: list[Message]
    top_k: int = 5


def process_resume_pipeline(application_id: str, applicant_id: str, job_id: str, resume_url: str, resume_text: str, job_description: str):
    try:
        extracted_text = resume_text

        # 1. Download & Extract Text (Unchanged)
        if not extracted_text:
            print(f"📄 No cache found for {applicant_id}. Downloading PDF...")
            # ... (keep your existing extraction code here) ...
            
            db.users.update_one(
                {"_id": ObjectId(applicant_id)},
                {"$set": {"profile.extractedResumeText": extracted_text}}
            )
        else:
            print(f"⚡ Using cached resume text for {applicant_id}!")

        # 2. ChromaDB Vector Embedding - CHANGED TO UPSERT
        print("💾 Upserting to ChromaDB...")
        collection.upsert( # <-- Changed from .add() to .upsert()
            documents=[extracted_text],
            metadatas=[{"job_id": job_id, "applicant_id": applicant_id}],
            ids=[application_id] 
        )

        # 3. Gemini ATS Evaluation with AUTOMATIC RETRIES
        prompt = f"""... (keep your existing prompt text here) ..."""
        
        max_retries = 3
        ai_data = {}
        
        for attempt in range(max_retries):
            try:
                print(f"🤖 Asking Gemini for ATS evaluation (Attempt {attempt + 1}/{max_retries})...")
                analysis_res = client.models.generate_content(
                    model='gemini-3.6-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                ai_data = json.loads(analysis_res.text)
                print("✅ Gemini evaluation successful!")
                break # Break out of the retry loop if successful
                
            except Exception as api_error:
                error_msg = str(api_error)
                # Check if it is a temporary Google server error (503) or quota error (429)
                if "503" in error_msg or "429" in error_msg:
                    if attempt < max_retries - 1:
                        print(f"⚠️ Gemini API busy. Waiting 10 seconds before retrying...")
                        time.sleep(10) # Pause the background worker for 10 seconds
                    else:
                        print("❌ Exhausted all retries for Gemini API.")
                        raise api_error # Fail completely after 3 attempts
                else:
                    raise api_error # If it's a different error (like bad JSON), fail immediately

        # 4. Write Results to MongoDB (Unchanged)
        print("💾 Saving final scores to MongoDB...")
        db.applications.update_one(
            {"_id": ObjectId(application_id)},
            {"$set": {
                "aiAnalysis": {
                    "matchScore": ai_data.get("match_score", 0),
                    "matchingSkills": ai_data.get("matching_skills", []),
                    "missingSkills": ai_data.get("missing_skills", []),
                    "summary": ai_data.get("summary", ""),
                    "status": "completed"
                }
            }}
        )
        print(f"🎉 Pipeline completely finished for {application_id}")

    except Exception as e:
        print(f"❌ Pipeline error for application {application_id}: {e}")
        db.applications.update_one(
            {"_id": ObjectId(application_id)},
            {"$set": {"aiAnalysis.status": "failed"}}
        )

@app.post("/process-application")
async def process_application_endpoint(payload: ProcessApplicationPayload, background_tasks: BackgroundTasks):
    background_tasks.add_task(
        process_resume_pipeline,
        payload.application_id,
        payload.applicant_id,
        payload.job_id,
        payload.resume_url,
        payload.resume_text,
        payload.job_description
    )
    return {"message": "Application queued for ingestion and analysis", "success": True}


@app.post("/search-candidates")
async def search_candidates(payload: SearchPayload):
    try:
        # Search ChromaDB using the raw text. 
        # It automatically embeds the query using all-MiniLM-L6-v2!
        results = collection.query(
            query_texts=[payload.query],
            n_results=payload.top_k,
            where={"job_id": payload.job_id}
        )

        if not results['documents'] or len(results['documents'][0]) == 0:
            return {"candidates": []}

        # Augment Context & Generate Reasoning with Gemini
        candidates_data = []
        for i in range(len(results['ids'][0])):
            doc = results['documents'][0][i]
            meta = results['metadatas'][0][i]
            
            prompt = f"""
            You are an expert technical recruiter. 
            Evaluate the following candidate's resume extract against the recruiter's specific search query.
            
            Recruiter's Query: "{payload.query}"
            
            Candidate's Resume Extract: 
            "{doc}"
            
            Provide a JSON response with two keys:
            1. "match_score": A number out of 100 representing how well they fit the query.
            2. "rationale": A single, concise sentence explaining exactly why they are a good match based on their resume.
            """
            
            eval_response = client.models.generate_content(
                model='gemini-3.6-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            
            evaluation = json.loads(eval_response.text)
            
            candidates_data.append({
                "applicant_id": meta['applicant_id'],
                "match_score": evaluation.get("match_score", 0),
                "rationale": evaluation.get("rationale", "Match found based on semantic similarity.")
            })

        # Sort descending by score
        candidates_data.sort(key=lambda x: x['match_score'], reverse=True)

        return {"candidates": candidates_data}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat-candidates")
async def chat_candidates(payload: ChatPayload):
    try:
        if not payload.messages:
            return {"reply": "No messages provided.", "candidates": []}

        # 1. Format the chat history for the LLM
        history_text = "\n".join([f"{m.role.upper()}: {m.content}" for m in payload.messages])
        
        # 2. Contextual Query Rewriting
        # We ask Gemini to figure out what the recruiter actually wants based on the whole conversation
        rewrite_prompt = f"""
        You are an AI recruitment assistant. Review the chat history and extract the recruiter's current search intent as a single, highly detailed search query.
        If they are asking a follow-up question (e.g., "only those with Docker"), combine it with their previous requirements.
        
        Chat History:
        {history_text}
        
        Return ONLY the standalone search query string. Do not include any conversational filler.
        """
        
        rewrite_response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=rewrite_prompt
        )
        search_query = rewrite_response.text.strip()

        # 3. Search ChromaDB using the contextualized query
        results = collection.query(
            query_texts=[search_query],
            n_results=payload.top_k,
            where={"job_id": payload.job_id}
        )

        if not results['documents'] or len(results['documents'][0]) == 0:
            return {"reply": "I couldn't find any candidates matching those requirements in the database.", "candidates": []}

        # 4. Evaluate Candidates against the NEW query
        candidates_data = []
        for i in range(len(results['ids'][0])):
            doc = results['documents'][0][i]
            meta = results['metadatas'][0][i]
            
            eval_prompt = f"""
            You are an expert technical recruiter. Evaluate this candidate against the query: "{search_query}"
            
            Candidate's Resume Extract: "{doc}"
            
            Provide a JSON response:
            1. "match_score": A number out of 100.
            2. "rationale": A single sentence explaining why.
            """
            
            eval_response = client.models.generate_content(
                model='gemini-3.5-flash',
                contents=eval_prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            
            evaluation = json.loads(eval_response.text)
            candidates_data.append({
                "applicant_id": meta['applicant_id'],
                "match_score": evaluation.get("match_score", 0),
                "rationale": evaluation.get("rationale", "Match found based on semantic similarity.")
            })

        # Sort descending by score
        candidates_data.sort(key=lambda x: x['match_score'], reverse=True)

        # 5. Generate the AI's conversational reply
        reply_prompt = f"""
        You are a helpful recruiter copilot. The recruiter just searched for: "{search_query}".
        You found {len(candidates_data)} candidates. 
        Write a very brief, friendly 1-2 sentence response to the recruiter acknowledging what you found. 
        Do not list the candidates' names, just summarize the action.
        """
        reply_response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=reply_prompt
        )

        return {
            "reply": reply_response.text.strip(),
            "candidates": candidates_data
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))