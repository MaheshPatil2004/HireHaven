import React from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { MoreHorizontal, Bot, Search, Loader2, AlertCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import axios from 'axios';
import { APPLICATION_API_END_POINT } from '../../utils/constant';

const shortlistingStatus = ["Accepted", "Rejected"];

const ApplicantsTable = ({ ragResults }) => {
    const { applicants } = useSelector(store => store.application);

    const statusHandler = async (status, id) => {
        try {
            axios.defaults.withCredentials = true;
            const res = await axios.post(`${APPLICATION_API_END_POINT}/status/${id}/update`, { status });
            if (res.data.success) {
                toast.success(res.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        }
    }

    // 1. Safe copy & dynamic sorting
    let displayedApplicants = applicants?.applications ? [...applicants.applications] : [];

    if (ragResults) {
        displayedApplicants.sort((a, b) => {
            const idA = a?.applicant?._id;
            const idB = b?.applicant?._id;
            const scoreA = (idA && ragResults[idA]?.match_score) || 0;
            const scoreB = (idB && ragResults[idB]?.match_score) || 0;
            return scoreB - scoreA;
        });
    }

    return (
        <div>
            <Table>
                <TableCaption>A list of your recent applied users</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>FullName</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Resume</TableHead>
                        <TableHead className="w-56">AI Evaluation</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {
                        displayedApplicants.map((item, index) => {
                            const applicantId = item?.applicant?._id;
                            const aiSearchData = ragResults && applicantId ? ragResults[applicantId] : null;
                            const aiStatus = item?.aiAnalysis?.status;
                            const hasAiScore = item?.aiAnalysis?.matchScore > 0 || aiStatus === 'completed';

                            return (
                                <TableRow key={item._id} className={aiSearchData ? "bg-blue-50/30" : ""}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {/* Rank badge when Copilot search is active */}
                                            {ragResults && (
                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                                                    #{index + 1}
                                                </span>
                                            )}
                                            {item?.applicant?.fullname || "Unnamed Applicant"}
                                        </div>
                                    </TableCell>
                                    <TableCell>{item?.applicant?.email}</TableCell>
                                    <TableCell>{item?.applicant?.phoneNumber || "NA"}</TableCell>
                                    <TableCell>
                                        {
                                            item.applicant?.profile?.resume ? (
                                                <a 
                                                    className="text-blue-600 hover:underline max-w-[140px] truncate block" 
                                                    href={item?.applicant?.profile?.resume} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    title={item?.applicant?.profile?.resumeOriginalName}
                                                >
                                                    {item?.applicant?.profile?.resumeOriginalName || "View PDF"}
                                                </a>
                                            ) : <span className="text-gray-400">NA</span>
                                        }
                                    </TableCell>

                                    {/* AI Evaluation Badges */}
                                    <TableCell>
                                        <div className="flex flex-col gap-1.5">
                                            {/* Baseline ATS Score */}
                                            {hasAiScore ? (
                                                <Popover>
                                                    <PopoverTrigger className="cursor-pointer w-fit">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold shadow-sm border ${
                                                                item.aiAnalysis.matchScore >= 75 ? 'bg-green-50 text-green-700 border-green-200' 
                                                                : item.aiAnalysis.matchScore >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                                                                : 'bg-red-50 text-red-700 border-red-200'
                                                            }`}>
                                                                {item.aiAnalysis.matchScore}% JD Match
                                                            </span>
                                                            <Bot className="w-3.5 h-3.5 text-gray-400 hover:text-purple-600 transition-colors" />
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 p-4 shadow-lg">
                                                        <h4 className="font-semibold text-sm mb-2 text-purple-900 flex items-center gap-1.5">
                                                            <Bot className="w-4 h-4" /> Baseline Resume Evaluation
                                                        </h4>
                                                        <p className="text-xs text-gray-700 mb-3 leading-relaxed">
                                                            {item.aiAnalysis.summary || "No summary available."}
                                                        </p>
                                                        
                                                        <div className="space-y-1.5 text-xs border-t pt-2">
                                                            <div>
                                                                <strong className="text-green-700">Matching Skills: </strong> 
                                                                {item.aiAnalysis.matchingSkills?.length ? item.aiAnalysis.matchingSkills.join(", ") : "None identified"}
                                                            </div>
                                                            <div>
                                                                <strong className="text-red-600">Missing Skills: </strong> 
                                                                {item.aiAnalysis.missingSkills?.length ? item.aiAnalysis.missingSkills.join(", ") : "None identified"}
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            ) : aiStatus === 'processing' ? (
                                                <div className="flex items-center gap-1.5 text-blue-600 text-xs font-medium">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Analyzing PDF...</span>
                                                </div>
                                            ) : aiStatus === 'failed' ? (
                                                <div className="flex items-center gap-1 text-red-500 text-xs">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    <span>Analysis Failed</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Queued for AI</span>
                                            )}

                                            {/* Copilot RAG Search Match Badge */}
                                            {aiSearchData && (
                                                <Popover>
                                                    <PopoverTrigger className="cursor-pointer w-fit animate-in fade-in duration-200">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-sm flex items-center gap-1">
                                                                <Search className="w-3 h-3" />
                                                                Query Match: {aiSearchData.match_score}%
                                                            </span>
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 p-4 shadow-lg border-blue-200">
                                                        <h4 className="font-semibold text-sm mb-2 text-blue-900 flex items-center gap-1.5">
                                                            <Search className="w-4 h-4" /> Copilot Match Rationale
                                                        </h4>
                                                        <p className="text-xs text-gray-700 leading-relaxed">
                                                            {aiSearchData.rationale}
                                                        </p>
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-xs text-gray-600">
                                        {item?.createdAt?.split("T")[0]}
                                    </TableCell>
                                    
                                    <TableCell className="text-right">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
                                                    <MoreHorizontal className="w-4 h-4 text-gray-600" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-32 p-1.5">
                                                {
                                                    shortlistingStatus.map((status, idx) => (
                                                        <div 
                                                            onClick={() => statusHandler(status, item?._id)} 
                                                            key={idx} 
                                                            className='flex w-full items-center p-2 text-xs font-medium hover:bg-gray-50 rounded cursor-pointer transition-colors'
                                                        >
                                                            {status}
                                                        </div>
                                                    ))
                                                }
                                            </PopoverContent>
                                        </Popover>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    }
                </TableBody>
            </Table>
        </div>
    )
}

export default ApplicantsTable;