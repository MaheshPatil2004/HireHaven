import React from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { MoreHorizontal, Bot } from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import axios from 'axios';
import { APPLICATION_API_END_POINT } from '../../utils/constant';

const shortlistingStatus = ["Accepted", "Rejected"];

const ApplicantsTable = () => {
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
                        <TableHead>AI Match Score</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {
                        applicants && applicants?.applications?.map((item) => (
                            <TableRow key={item._id}>
                                <TableCell>{item?.applicant?.fullname}</TableCell>
                                <TableCell>{item?.applicant?.email}</TableCell>
                                <TableCell>{item?.applicant?.phoneNumber}</TableCell>
                                <TableCell>
                                    {
                                        item.applicant?.profile?.resume ? <a className="text-blue-600 cursor-pointer" href={item?.applicant?.profile?.resume} target="_blank" rel="noopener noreferrer">{item?.applicant?.profile?.resumeOriginalName}</a> : <span>NA</span>
                                    }
                                </TableCell>

                                {/* AI EVALUATION CELL */}
                                <TableCell>
                                    {item?.aiAnalysis?.matchScore ? (
                                        <Popover>
                                            <PopoverTrigger className="cursor-pointer">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                        item.aiAnalysis.matchScore >= 75 ? 'bg-green-100 text-green-800' 
                                                        : item.aiAnalysis.matchScore >= 50 ? 'bg-yellow-100 text-yellow-800' 
                                                        : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {item.aiAnalysis.matchScore}% Match
                                                    </span>
                                                    <Bot className="w-4 h-4 text-purple-600" />
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80 p-4">
                                                <h4 className="font-semibold text-sm mb-2 text-purple-900 flex items-center gap-1">
                                                    <Bot className="w-4 h-4" /> AI Candidate Summary
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
                                        <span className="text-gray-400 text-xs">Pending AI</span>
                                    )}
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
                        ))
                    }
                </TableBody>
            </Table>
        </div>
    )
}

export default ApplicantsTable