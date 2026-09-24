import React, { useEffect, useState } from 'react'
import Navbar from '../shared/Navbar'
import ApplicantsTable from './ApplicantsTable'
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setAllApplicants } from '../../redux/applicationSlice';
import { APPLICATION_API_END_POINT } from '../../utils/constant';

const Applicants = () => {
    const params = useParams();
    const dispatch = useDispatch();
    const { applicants } = useSelector(store => store.application);
    
    // --- NEW STATE FOR RAG SEARCH ---
    const [searchQuery, setSearchQuery] = useState("");
    const [ragResults, setRagResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const fetchAllApplicants = async () => {
            try {
                const res = await axios.get(`${APPLICATION_API_END_POINT}/${params.id}/applicants`, { withCredentials: true });
                dispatch(setAllApplicants(res.data.job));
            } catch (error) {
                console.log(error);
            }
        }
        fetchAllApplicants();
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

    return (
        <div>
            <Navbar />
            <div className='max-w-7xl mx-auto'>
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

                {/* We pass the ragResults down to the table here */}
                <ApplicantsTable ragResults={ragResults} />
            </div>
        </div>
    )
}

export default Applicants;