import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Initialize Google GenAI Client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Define structured JSON output format
class ResumeAnalysis(BaseModel):
    match_score: int
    matching_skills: list[str]
    missing_skills: list[str]
    summary: str

class AnalysisRequest(BaseModel):
    resume_text: str
    job_description: str

@app.post("/analyze")
async def analyze_resume(request: AnalysisRequest):
    prompt = f"""
    Act as an expert technical recruiter. Analyze the following resume text against the job description.
    
    Resume Text: {request.resume_text}
    Job Description: {request.job_description}
    """
    try:
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': ResumeAnalysis,
            },
        )
        return response.parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))