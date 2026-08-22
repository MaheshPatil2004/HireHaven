import { Job } from "../models/job.model.js";

// admin post krega job
export const postJob = async (req, res) => {
    try {
        const { title, description, requirements, salary, location, jobType, experience, position, companyId } = req.body;
        const userId = req.id;

        if (!title || !description || !requirements || !salary || !location || !jobType || !experience || !position || !companyId) {
            return res.status(400).json({
                message: "Something is missing.",
                success: false
            });
        }

        // Validation for negative or zero values
        if (Number(salary) <= 0 || Number(position) <= 0) {
            return res.status(400).json({
                message: "Salary and Number of Positions must be greater than zero.",
                success: false
            });
        }

        const job = await Job.create({
            title,
            description,
            requirements: typeof requirements === 'string' ? requirements.split(",") : requirements,
            salary: Number(salary),
            location,
            jobType,
            experienceLevel: experience,
            position,
            company: companyId,
            created_by: userId
        });

        return res.status(201).json({
            message: "New job created successfully.",
            job,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
}

// student k liye
export const getAllJobs = async (req, res) => {
    try {
        const keyword = req.query.keyword || "";
        const query = {
            $or: [
                { title: { $regex: keyword, $options: "i" } },
                { description: { $regex: keyword, $options: "i" } },
            ]
        };
        const jobs = await Job.find(query).populate({
            path: "company"
        }).sort({ createdAt: -1 });

        if (!jobs) {
            return res.status(404).json({
                message: "Jobs not found.",
                success: false
            });
        }
        return res.status(200).json({
            jobs,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
}

// student
export const getJobById = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId).populate({
            path: "applications"
        });

        if (!job) {
            return res.status(404).json({
                message: "Jobs not found.",
                success: false
            });
        }
        return res.status(200).json({ job, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
}

// admin kitne job create kra hai abhi tk
export const getAdminJobs = async (req, res) => {
    try {
        const adminId = req.id;
        const jobs = await Job.find({ created_by: adminId }).populate({
            path: 'company',
            options: { sort: { createdAt: -1 } }
        });

        if (!jobs) {
            return res.status(404).json({
                message: "Jobs not found.",
                success: false
            });
        }
        return res.status(200).json({
            jobs,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
}

// admin edit/update krega job
export const updateJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const updateData = req.body;

        // Prevent updating to negative or zero values
        if (updateData.salary !== undefined && Number(updateData.salary) <= 0) {
            return res.status(400).json({
                message: "Salary must be greater than zero.",
                success: false
            });
        }
        if (updateData.position !== undefined && Number(updateData.position) <= 0) {
            return res.status(400).json({
                message: "Number of Positions must be greater than zero.",
                success: false
            });
        }

        // If requirements are passed as a string, format them correctly
        if (updateData.requirements && typeof updateData.requirements === 'string') {
            updateData.requirements = updateData.requirements.split(",");
        }

        const job = await Job.findByIdAndUpdate(jobId, updateData, { 
            new: true, 
            runValidators: true 
        });

        if (!job) {
            return res.status(404).json({
                message: "Job not found.",
                success: false
            });
        }

        return res.status(200).json({
            message: "Job updated successfully.",
            job,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

// admin delete krega job
export const deleteJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        
        const job = await Job.findByIdAndDelete(jobId);

        if (!job) {
            return res.status(404).json({
                message: "Job not found.",
                success: false
            });
        }

        return res.status(200).json({
            message: "Job deleted successfully.",
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};