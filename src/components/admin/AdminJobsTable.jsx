import React, { useEffect, useState } from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Edit2, Eye, MoreHorizontal, Trash2 } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { JOB_API_END_POINT } from '../../utils/constant'
import { toast } from 'sonner'
import { setAllAdminJobs } from '../../redux/jobSlice'

const AdminJobsTable = () => { 
    const { allAdminJobs, searchJobByText } = useSelector(store => store.job);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [filterJobs, setFilterJobs] = useState(allAdminJobs);

    useEffect(() => { 
        console.log('called');
        const filteredJobs = allAdminJobs.filter((job) => {
            if (!searchJobByText) {
                return true;
            }
            return job?.title?.toLowerCase().includes(searchJobByText.toLowerCase()) || job?.company?.name.toLowerCase().includes(searchJobByText.toLowerCase());
        });
        setFilterJobs(filteredJobs);
    }, [allAdminJobs, searchJobByText])

    // Delete Job Handler
    const deleteJobHandler = async (jobId) => {
        try {
            const res = await axios.delete(`${JOB_API_END_POINT}/delete/${jobId}`, {
                withCredentials: true
            });
            
            if (res.data.success) {
                toast.success(res.data.message);
                // Remove deleted job from Redux store to instantly update the UI
                const updatedJobs = allAdminJobs.filter((job) => job._id !== jobId);
                dispatch(setAllAdminJobs(updatedJobs));
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "Failed to delete job");
        }
    }

    return (
        <div>
            <Table>
                <TableCaption>A list of your recent posted jobs</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {
                        filterJobs?.map((job) => (
                            <TableRow key={job._id}>
                                <TableCell>{job?.company?.name}</TableCell>
                                <TableCell>{job?.title}</TableCell>
                                <TableCell>{job?.createdAt.split("T")[0]}</TableCell>
                                <TableCell className="text-right cursor-pointer">
                                    <Popover>
                                        <PopoverTrigger><MoreHorizontal /></PopoverTrigger>
                                        <PopoverContent className="w-32">
                                            {/* Edit Button */}
                                            <div onClick={() => navigate(`/admin/jobs/update/${job._id}`)} className='flex items-center gap-2 w-fit cursor-pointer hover:text-blue-600 mb-2'>
                                                <Edit2 className='w-4' />
                                                <span>Edit</span>
                                            </div>
                                            
                                            {/* Applicants Button */}
                                            <div onClick={() => navigate(`/admin/jobs/${job._id}/applicants`)} className='flex items-center w-fit gap-2 cursor-pointer mb-2'>
                                                <Eye className='w-4'/>
                                                <span>Applicants</span>
                                            </div>

                                            {/* Delete Button */}
                                            <div onClick={() => deleteJobHandler(job._id)} className='flex items-center gap-2 w-fit cursor-pointer text-red-600 hover:text-red-800'>
                                                <Trash2 className='w-4' />
                                                <span>Delete</span>
                                            </div>
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

export default AdminJobsTable