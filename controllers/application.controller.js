import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import axios from "axios";

// 1. Apply Job (With AI Integration)
export const applyJob = async (req, res) => {
    try {
        const userId = req.id;
        const jobId = req.params.id;

        if (!jobId) {
            return res.status(400).json({ message: "Job id is required.", success: false });
        }

        const existingApplication = await Application.findOne({ job: jobId, applicant: userId });
        if (existingApplication) {
            return res.status(400).json({ message: "You have already applied for this job", success: false });
        }

        const job = await Job.findById(jobId);
        const user = await User.findById(userId);

        if (!job || !user) {
            return res.status(404).json({ message: "Job or user not found", success: false });
        }

        const hasResume = Boolean(user.profile?.resume);

        // 1. Create application record
        const application = await Application.create({
            job: jobId,
            applicant: userId,
            aiAnalysis: {
                matchScore: 0,
                status: hasResume ? "processing" : "failed",
                matchingSkills: [],
                missingSkills: [],
                summary: hasResume ? "AI is analyzing resume..." : "No resume uploaded."
            }
        });

        job.applications.push(application._id);
        await job.save();

        // 2. Dispatch to Python worker if resume exists
        if (hasResume) {
            const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
            const jobDescriptionText = `${job.title}: ${job.description}. Requirements: ${job.requirements?.join(", ") || ""}`;

            axios.post(`${aiServiceUrl}/process-application`, {
                application_id: application._id.toString(),
                applicant_id: userId.toString(),
                job_id: jobId.toString(),
                resume_url: user.profile.resume,
                resume_text: user.profile.extractedResumeText || "",
                job_description: jobDescriptionText
            }).catch(err => console.error("Worker trigger failed:", err.message));
        }

        return res.status(201).json({
            message: "Job applied successfully.",
            success: true
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

// Search Candidates with RAG (For Employer/Recruiter)
export const searchCandidatesWithRAG = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({
                message: "Search query is required",
                success: false
            });
        }

        // 1. Call FastAPI RAG endpoint
        const aiResponse = await axios.post("http://127.0.0.1:8000/search-candidates", {
            job_id: jobId,
            query: query,
            top_k: 5
        });

        const rankedCandidates = aiResponse.data.candidates || [];

        return res.status(200).json({
            candidates: rankedCandidates,
            success: true
        });
    } catch (error) {
        console.error("RAG Search Error:", error.message);
        return res.status(500).json({
            message: "Failed to perform intelligent search",
            success: false
        });
    }
};
// 2. Get Applied Jobs (For Job Seeker)
export const getAppliedJobs = async (req, res) => {
    try {
        const userId = req.id;
        const application = await Application.find({ applicant: userId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'job',
                options: { sort: { createdAt: -1 } },
                populate: {
                    path: 'company',
                    options: { sort: { createdAt: -1 } },
                }
            });
            
        if (!application) {
            return res.status(404).json({
                message: "No Applications",
                success: false
            });
        };

        return res.status(200).json({
            application,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
}

// 3. Get Applicants (For Employer/Recruiter)
export const getApplicants = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId).populate({
            path: 'applications',
            options: { sort: { createdAt: -1 } },
            populate: {
                path: 'applicant', 
                options: { sort: { createdAt: -1 } }
            }
        });

        if (!job) {
            return res.status(404).json({
                message: 'Job not found.',
                success: false
            });
        };

        return res.status(200).json({
            job, 
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
}

// 4. Update Application Status (For Employer/Recruiter)
export const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const applicationId = req.params.id;
        
        if (!status) {
            return res.status(400).json({ message: 'status is required', success: false });
        }
        
        const application = await Application.findOne({ _id: applicationId });
        if (!application) {
            return res.status(404).json({ message: "Application not found.", success: false });
        }
        
        application.status = status.toLowerCase();
        await application.save();
        
        return res.status(200).json({ message: "Status updated successfully.", success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
}