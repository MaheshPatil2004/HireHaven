import { CopilotSession } from "../models/copilot.model.js";
import axios from "axios";

// Fetch chat history for the active session
export const getChatHistory = async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const recruiterId = req.id; 

        // ONLY fetch the active session
        let session = await CopilotSession.findOne({ job: jobId, recruiter: recruiterId, isActive: true });
        
        if (!session) {
            return res.status(200).json({ success: true, messages: [] });
        }

        return res.status(200).json({ success: true, messages: session.messages });
    } catch (error) {
        console.error("Fetch Chat Error:", error);
        return res.status(500).json({ success: false, message: "Server error fetching chat." });
    }
};

// Handle a new message with a 10-message sliding window
export const sendMessage = async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const recruiterId = req.id;
        const { message, top_k = 5 } = req.body;

        if (!message) return res.status(400).json({ success: false, message: "Message is required." });

        let session = await CopilotSession.findOne({ job: jobId, recruiter: recruiterId, isActive: true });
        if (!session) {
            session = await CopilotSession.create({ job: jobId, recruiter: recruiterId, isActive: true, messages: [] });
        }

        session.messages.push({ role: "user", content: message });
        await session.save();

        // SLIDING WINDOW: Only send the last 10 messages to Gemini to save tokens and prevent latency
        const messagesForAI = session.messages.slice(-10);

        const aiResponse = await axios.post("http://127.0.0.1:8000/chat-candidates", {
            job_id: jobId,
            messages: messagesForAI, // Sends the truncated array
            top_k: top_k
        });

        const aiReplyText = aiResponse.data.reply || "Here are the top matches.";
        const rankedCandidates = aiResponse.data.candidates || [];

        session.messages.push({ role: "ai", content: aiReplyText, candidatesReturned: rankedCandidates.map(c => c.applicant_id) });
        await session.save();

        return res.status(200).json({ 
            success: true, 
            message: session.messages[session.messages.length - 1], 
            candidates: rankedCandidates
        });

    } catch (error) {
        console.error("Send Message Error:", error);
        return res.status(500).json({ success: false, message: "Server error processing message." });
    }
};

// NEW: Archive current chat and start a fresh one
export const startNewChat = async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const recruiterId = req.id;

        // Archive any currently active sessions for this job/recruiter combo
        await CopilotSession.updateMany(
            { job: jobId, recruiter: recruiterId, isActive: true },
            { $set: { isActive: false } }
        );

        // Create a new blank active session
        const newSession = await CopilotSession.create({
            job: jobId,
            recruiter: recruiterId,
            isActive: true,
            messages: []
        });

        return res.status(200).json({ success: true, messages: newSession.messages });
    } catch (error) {
        console.error("Start New Chat Error:", error);
        return res.status(500).json({ success: false, message: "Server error starting new chat." });
    }
};