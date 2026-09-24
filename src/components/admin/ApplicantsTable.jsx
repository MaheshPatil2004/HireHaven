import React from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { MoreHorizontal, Bot, Search } from 'lucide-react'; // Added Search icon
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import axios from 'axios';
import { APPLICATION_API_END_POINT } from '../../utils/constant';

const shortlistingStatus = ["Accepted", "Rejected"];

// 1. Accept ragResults as a prop
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
            toast.error(error.response.data.message);
        }
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
                        <TableHead className="w-64">AI Evaluation</TableHead> {/* Widened for both scores */}
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {
                        applicants && applicants?.applications?.map((item) => {
                            // 2. Extract RAG search data for this specific applicant if a search was done
                            const applicantId = item?.applicant?._id;
                            const aiSearchData = ragResults ? ragResults[applicantId] : null;

                            return (
                                <TableRow key={item._id}>
                                    <TableCell>{item?.applicant?.fullname}</TableCell>
                                    <TableCell>{item?.applicant?.email}</TableCell>
                                    <TableCell>{item?.applicant?.phoneNumber}</TableCell>
                                    <TableCell>
                                        {
                                            item.applicant?.profile?.resume ? <a className="text-blue-600 cursor-pointer" href={item?.applicant?.profile?.resume} target="_blank" rel="noopener noreferrer">{item?.applicant?.profile?.resumeOriginalName}</a> : <span>NA</span>
                                        }
                                    </TableCell>

                                    {/* AI EVALUATION CELL - COMBINED */}
                                    <TableCell>
                                        <div className="flex flex-col gap-2">
                                            {/* Baseline ATS Score (Your existing code) */}
                                            {item?.aiAnalysis?.matchScore ? (
                                                <Popover>
                                                    <PopoverTrigger className="cursor-pointer w-fit">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                                item.aiAnalysis.matchScore >= 75 ? 'bg-green-100 text-green-800' 
                                                                : item.aiAnalysis.matchScore >= 50 ? 'bg-yellow-100 text-yellow-800' 
                                                                : 'bg-red-100 text-red-800'
                                                            }`}>
                                                                {item.aiAnalysis.matchScore}% JD Match
                                                            </span>
                                                            <Bot className="w-4 h-4 text-purple-600" />
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 p-4">
                                                        <h4 className="font-semibold text-sm mb-2 text-purple-900 flex items-center gap-1">
                                                            <Bot className="w-4 h-4" /> Baseline Job Summary
                                                        </h4>
                                                        <p className="text-xs text-gray-600 mb-3">{item.aiAnalysis.summary}</p>
                                                        
                                                        <div className="space-y-1.5 text-xs">
                                                            <div>
                                                                <strong className="text-green-700">Matching Skills: </strong> 
                                                                {item.aiAnalysis.matchingSkills?.join(", ") || "None"}
                                                            </div>
                                                            <div>
                                                                <strong className="text-red-600">Missing Skills: </strong> 
                                                                {item.aiAnalysis.missingSkills?.join(", ") || "None"}
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            ) : (
                                                <span className="text-gray-400 text-xs">Pending AI Analysis</span>
                                            )}

                                            {/* NEW: RAG Query Match Score (Only shows when search is performed) */}
                                            {aiSearchData && (
                                                <div className="bg-blue-50 border border-blue-200 p-2 rounded-md animate-in fade-in zoom-in duration-300">
                                                    <div className="text-blue-800 text-xs font-bold mb-1 flex items-center gap-1">
                                                        <Search className="w-3 h-3" /> 
                                                        Query Match: {aiSearchData.match_score}%
                                                    </div>
                                                    <div className="text-[11px] text-blue-900 leading-tight">
                                                        {aiSearchData.rationale}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>{item?.createdAt?.split("T")[0]}</TableCell>
                                    <TableCell className="text-right cursor-pointer">
                                        <Popover>
                                            <PopoverTrigger>
                                                <MoreHorizontal />
                                            </PopoverTrigger>
                                            <PopoverContent className="w-32">
                                                {
                                                    shortlistingStatus.map((status, index) => {
                                                        return (
                                                            <div onClick={() => statusHandler(status, item?._id)} key={index} className='flex w-fit items-center my-2 cursor-pointer'>
                                                                <span>{status}</span>
                                                            </div>
                                                        )
                                                    })
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

export default ApplicantsTable