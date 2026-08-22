import React, { useEffect, useState } from 'react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useSelector } from 'react-redux'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import axios from 'axios'
import { JOB_API_END_POINT } from '../utils/constant'
import { toast } from 'sonner'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

const UpdateJob = () => {
    const params = useParams();
    const jobId = params.id;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { allAdminJobs } = useSelector(store => store.job);
    const { companies } = useSelector(store => store.company);

    // Initialize state
    const [input, setInput] = useState({
        title: "",
        description: "",
        requirements: "",
        salary: "",
        location: "",
        jobType: "",
        experience: "",
        position: 0,
        companyId: ""
    });

    // Populate the form with the existing job data
    useEffect(() => {
        const job = allAdminJobs.find((j) => j._id === jobId);
        if (job) {
            setInput({
                title: job.title || "",
                description: job.description || "",
                requirements: job.requirements ? job.requirements.join(",") : "",
                salary: job.salary || "",
                location: job.location || "",
                jobType: job.jobType || "",
                experience: job.experienceLevel || "",
                position: job.position || 0,
                companyId: job.company?._id || ""
            });
        }
    }, [jobId, allAdminJobs]);

    const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
    };

    const selectChangeHandler = (value) => {
        setInput({ ...input, companyId: value });
    };

    const submitHandler = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await axios.put(`${JOB_API_END_POINT}/update/${jobId}`, input, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            });
            if (res.data.success) {
                toast.success(res.data.message);
                navigate("/admin/jobs"); // Send them back to the table
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Update failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            {/* You can wrap this in your Navbar layout like PostJob.jsx */}
            <div className='flex items-center justify-center w-screen my-5'>
                <form onSubmit={submitHandler} className='p-8 max-w-4xl border border-gray-200 shadow-lg rounded-md'>
                    <div className='grid grid-cols-2 gap-2'>
                        <div>
                            <Label>Title</Label>
                            <Input type="text" name="title" value={input.title} onChange={changeEventHandler} />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Input type="text" name="description" value={input.description} onChange={changeEventHandler} />
                        </div>
                        <div>
                            <Label>Requirements</Label>
                            <Input type="text" name="requirements" value={input.requirements} onChange={changeEventHandler} />
                        </div>
                        <div>
                            <Label>Salary</Label>
                            <Input type="number" name="salary" min="0" value={input.salary} onChange={changeEventHandler} />
                        </div>
                        <div>
                            <Label>No of Positions</Label>
                            <Input type="number" name="position" min="0" value={input.position} onChange={changeEventHandler} />
                        </div>
                        {/* Add remaining inputs (Location, Job Type, Experience) matching PostJob.jsx */}
                    </div>
                    
                    {loading ? (
                        <Button className="w-full my-4"><Loader2 className='mr-2 h-4 w-4 animate-spin' /> Please wait</Button>
                    ) : (
                        <Button type="submit" className="w-full my-4">Update Job</Button>
                    )}
                </form>
            </div>
        </div>
    )
}

export default UpdateJob