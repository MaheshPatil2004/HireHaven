import React, { useEffect, useState } from 'react'
import Navbar from '../shared/Navbar'
import ApplicantsTable from './ApplicantsTable'
import RecruiterCopilot from './RecruiterCopilot'
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setAllApplicants } from '../../redux/applicationSlice';
import { APPLICATION_API_END_POINT, COPILOT_API_END_POINT } from '../../utils/constant';

const Applicants = () => {
    const params = useParams();
    const dispatch = useDispatch();
    const { applicants } = useSelector(store => store.application);
    
    // --- NEW STATE FOR RAG SEARCH ---
    const [searchQuery, setSearchQuery] = useState("");
    const [ragResults, setRagResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    // New RAG/Copilot States
    const [chatMessages, setChatMessages] = useState([]);
    const [isCopilotTyping, setIsCopilotTyping] = useState(false);

    useEffect(() => {
        const fetchAllApplicants = async () => {
            try {
                const res = await axios.get(`${APPLICATION_API_END_POINT}/${params.id}/applicants`, { withCredentials: true });
                dispatch(setAllApplicants(res.data.job));
            } catch (error) {
                console.log(error);
            }
        }
        
        const fetchChatHistory = async () => {
            try {
                const res = await axios.get(`${COPILOT_API_END_POINT}/job/${params.id}/history`, { withCredentials: true });
                if (res.data.success) {
                    setChatMessages(res.data.messages);
                }
            } catch (error) {
                console.error("Failed to load chat history", error);
            }
        }

        fetchAllApplicants();
        fetchChatHistory();
    }, [params.id, dispatch]);

    // --- NEW FUNCTION: INTELLIGENT SEARCH ---
    const handleIntelligentSearch = async () => {
        if (!searchQuery) {
            setRagResults(null); 
            return;
        }
        setIsSearching(true);
        try {
            const res = await axios.post(`${APPLICATION_API_END_POINT}/job/${params.id}/search`, {
                query: searchQuery
            }, { withCredentials: true });

            if (res.data.success) {
                // Convert array to a map { applicant_id: { score, rationale } } for easy lookup in the table
                const resultsMap = {};
                res.data.candidates.forEach(candidate => {
                    resultsMap[candidate.applicant_id] = candidate;
                });
                setRagResults(resultsMap);
            }
        } catch (error) {
            console.error("Intelligent search failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    // Helper: Maps candidates array to the { id: data } format expected by ApplicantsTable
    const mapCandidatesToTable = (candidatesArray) => {
        const resultsMap = {};
        candidatesArray.forEach(candidate => {
            resultsMap[candidate.applicant_id] = candidate;
        });
        setRagResults(resultsMap);
    };

    // 3. Handle sending a message in the Copilot
    const handleSendMessage = async (userMessage) => {
        // Optimistically add user message to UI
        setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
        setIsCopilotTyping(true);

        try {
            const res = await axios.post(`${COPILOT_API_END_POINT}/job/${params.id}/send`, {
                message: userMessage,
                top_k: 5
            }, { withCredentials: true });

            if (res.data.success) {
                // Add AI's reply to chat window
                setChatMessages(prev => [...prev, res.data.message]);
                // Update table with the newly filtered candidates
                if (res.data.candidates) {
                    mapCandidatesToTable(res.data.candidates);
                }
            }
        } catch (error) {
            console.error("Chat message failed:", error);
            setChatMessages(prev => [...prev, { role: "ai", content: "Sorry, I encountered an error communicating with the server." }]);
        } finally {
            setIsCopilotTyping(false);
        }
    };

    // 4. Handle starting a new chat
    const handleNewChat = async () => {
        try {
            const res = await axios.post(`${COPILOT_API_END_POINT}/job/${params.id}/new`, {}, { withCredentials: true });
            if (res.data.success) {
                setChatMessages([]);
                setRagResults(null); // Clear table highlights
            }
        } catch (error) {
            console.error("Failed to start new chat:", error);
        }
    };

    return (
        <div>
            <Navbar />
            <div className='max-w-7xl mx-auto px-4'>
                <h1 className='font-bold text-xl my-5'>Applicants {applicants?.applications?.length}</h1>
                
                {/* --- INTELLIGENT SEARCH UI --- */}
                <div className="flex gap-4 mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <input 
                        type="text" 
                        placeholder="Intelligent Search (e.g., 'Find someone with FastAPI and Node.js experience')" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                        onClick={handleIntelligentSearch}
                        disabled={isSearching}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSearching ? "Searching AI..." : "Search"}
                    </button>
                </div>

                {/* 2-Column Dashboard Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    
                    {/* Left Side: Applicants Table (Takes up 2/3 of space) */}
                    <div className="lg:col-span-2 overflow-x-auto">
                        <ApplicantsTable ragResults={ragResults} />
                    </div>

                    {/* Right Side: Copilot Panel (Takes up 1/3 of space) */}
                    <div className="lg:col-span-1">
                        <RecruiterCopilot 
                            messages={chatMessages}
                            onSendMessage={handleSendMessage}
                            isTyping={isCopilotTyping}
                            onNewChat={handleNewChat}
                        />
                    </div>
                    
                </div>
            </div>
        </div>
    )
}

export default Applicants;