import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    applicant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    // Updated AI analysis schema
    aiAnalysis: {
        matchScore: { 
            type: Number, 
            default: 0 
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        },
        matchingSkills: [{ 
            type: String 
        }],
        missingSkills: [{ 
            type: String 
        }],
        summary: { 
            type: String, 
            default: "" 
        }
    }
}, { timestamps: true });

export const Application = mongoose.model("Application", applicationSchema);