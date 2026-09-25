import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["user", "ai"],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    candidatesReturned: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application'
    }]
}, { timestamps: true });

const copilotSessionSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    recruiter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // NEW: Tracks if this is the current chat or an archived one
    isActive: {
        type: Boolean,
        default: true
    },
    messages: [messageSchema]
}, { timestamps: true });

export const CopilotSession = mongoose.model("CopilotSession", copilotSessionSchema);