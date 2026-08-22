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

        if (!job) {
            return res.status(404).json({ message: "Job not found", success: false });
        }

        // --- AI MICROSERVICE CALL ---
        let aiResult = null;
        try {
            // This pulls the live Vercel URL you set in your dashboard, 
            // but falls back to your local python server when testing on your machine!
            //const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000/api/analyze";

            const aiResponse = await axios.post("https://hire-haven.vercel.app/api/analyze", {
                resume_text: user.profile?.skills?.join(", ") || "Applicant", 
                job_description: `${job.title}: ${job.description}. Requirements: ${job.requirements.join(", ")}`
            });
            
            // MAP THE PYTHON SNAKE_CASE TO MONGODB CAMELCASE
            aiResult = {
                matchScore: aiResponse.data.match_score,
                matchingSkills: aiResponse.data.matching_skills,
                missingSkills: aiResponse.data.missing_skills,
                summary: aiResponse.data.summary
            };

        } catch (error) {
            console.error("AI Service Error:", error.message);
        }

        // Create application with AI data
        const newApplication = await Application.create({
            job: jobId,
            applicant: userId,
            aiAnalysis: aiResult
        });

        job.applications.push(newApplication._id);
        await job.save();

        return res.status(201).json({
            message: "Job applied successfully.",
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error", success: false });
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