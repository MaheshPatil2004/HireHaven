from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types
import chromadb
import os
import json
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI()

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

class SearchPayload(BaseModel):
    job_id: str
    query: str
    top_k: int = 5

class AnalyzePayload(BaseModel):
    resume_text: str
    job_description: str

@app.post("/analyze")
async def analyze_application(payload: AnalyzePayload):
    try:
        prompt = f"""
        You are an expert ATS (Applicant Tracking System).
        Compare the candidate's profile against the job description.

        Candidate: {payload.resume_text}
        Job Description: {payload.job_description}

        Return a JSON response with:
        1. "match_score": A number between 0 and 100.
        2. "matching_skills": An array of matched skill strings.
        3. "missing_skills": An array of missing skill strings.
        4. "summary": A brief 2-sentence summary of the match.
        """
        
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        return json.loads(response.text)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed-resume")
async def embed_resume(payload: ResumePayload):
    try:
        document = payload.resume_text
        
        # Store directly in ChromaDB. 
        # It automatically embeds the document using all-MiniLM-L6-v2!
        collection.add(
            ids=[f"{payload.applicant_id}_{payload.job_id}"],
            documents=[document],
            metadatas=[{"applicant_id": payload.applicant_id, "job_id": payload.job_id}]
        )
        
        return {"success": True, "message": "Resume embedded successfully!"}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

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