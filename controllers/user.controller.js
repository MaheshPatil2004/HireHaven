import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";

export const register = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, password, role } = req.body;

        if (!fullname || !email || !phoneNumber || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        }

        const file = req.file;
        const fileUri = getDataUri(file);

        const cloudResponse = await cloudinary.uploader.upload(
            fileUri.content
        );

        const user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({
                message: "User already exist with this email.",
                success: false,
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            fullname,
            email,
            phoneNumber,
            password: hashedPassword,
            role,
            profile: {
                profilePhoto: cloudResponse.secure_url,
            }
        });

        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        });

    } catch (error) {
        console.log(error);
    }
};


export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        }

        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            });
        }

        const isPasswordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            });
        }

        // Check whether the selected role matches
        // the role stored for this user.
        if (role !== user.role) {
            return res.status(400).json({
                message: "Account doesn't exist with current role.",
                success: false
            });
        }

        // Data that will be stored inside the JWT
        const tokenData = {
            userId: user._id
        };

        // Create JWT
        const token = await jwt.sign(
            tokenData,
            process.env.SECRET_KEY,
            {
                expiresIn: "1d"
            }
        );

        // Don't send the password back to the frontend.
        user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        };

        /*
        ----------------------------------------------------
        COOKIE CONFIGURATION
        ----------------------------------------------------

        We use different settings for local development
        and production.

        LOCAL:
            Frontend -> http://localhost:5173
            Backend  -> http://localhost:3000

        PRODUCTION:
            Frontend -> https://your-frontend.vercel.app
            Backend  -> https://your-backend.vercel.app

        ----------------------------------------------------
        */

        // Check whether the backend is running in production.
        const isProduction = process.env.NODE_ENV === "production";

        return res
            .status(200)
            .cookie("token", token, {

                // Cookie will expire after 1 day.
                maxAge: 1 * 24 * 60 * 60 * 1000,

                /*
                IMPORTANT:
                httpOnly prevents JavaScript in the browser
                from reading the JWT cookie.

                This protects the token from many XSS-based
                token theft attacks.

                NOTE:
                Your original code had:

                    httpsOnly: true

                That is NOT a valid cookie option.

                The correct option is:

                    httpOnly: true
                */
                httpOnly: true,

                /*
                secure means the cookie is sent only over HTTPS.

                Local development uses HTTP, so secure must be
                false locally.

                Vercel uses HTTPS, so secure becomes true
                in production.
                */
                secure: isProduction,

                /*
                Locally we can use "lax".

                When frontend and backend are deployed separately,
                we use "none" so the browser can send the cookie
                across the frontend/backend origins.

                "none" requires secure: true, which is why both
                settings are changed together in production.
                */
                sameSite: isProduction ? "none" : "lax"

            })
            .json({
                message: `Welcome back ${user.fullname}`,
                user,
                success: true
            });

    } catch (error) {
        console.log(error);
    }
};


export const logout = async (req, res) => {
    try {

        // Use the same environment detection as login.
        const isProduction = process.env.NODE_ENV === "production";

        /*
        Delete the JWT cookie.

        We use the same important cookie attributes as the
        login cookie so the browser can correctly identify
        and remove the existing cookie.
        */
        return res
            .status(200)
            .cookie("token", "", {

                // Immediately expire the cookie.
                maxAge: 0,

                // Keep the cookie inaccessible to JavaScript.
                httpOnly: true,

                // HTTPS only in production.
                secure: isProduction,

                // Same setting used when the cookie was created.
                sameSite: isProduction ? "none" : "lax"

            })
            .json({
                message: "Logged out successfully.",
                success: true
            });

    } catch (error) {
        console.log(error);
    }
};


export const updateProfile = async (req, res) => {
    try {

        const {
            fullname,
            email,
            phoneNumber,
            bio,
            skills
        } = req.body;

        const file = req.file;

        // Upload profile/resume file to Cloudinary.
        const fileUri = getDataUri(file);

        const cloudResponse = await cloudinary.uploader.upload(
            fileUri.content
        );

        let skillsArray;

        if (skills) {
            skillsArray = skills.split(",");
        }

        // req.id is added by the authentication middleware.
        const userId = req.id;

        let user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({
                message: "User not found.",
                success: false
            });
        }

        // Update basic user information.
        if (fullname) {
            user.fullname = fullname;
        }

        if (email) {
            user.email = email;
        }

        if (phoneNumber) {
            user.phoneNumber = phoneNumber;
        }

        // Update profile information.
        if (bio) {
            user.profile.bio = bio;
        }

        if (skills) {
            user.profile.skills = skillsArray;
        }

        /*
        Save uploaded file URL in Cloudinary.

        This is used for the user's resume/profile file.
        */
        if (cloudResponse) {
            user.profile.resume = cloudResponse.secure_url;

            user.profile.resumeOriginalName =
                file.originalname;
        }

        await user.save();

        // Don't return the password.
        user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        };

        return res.status(200).json({
            message: "Profile updated successfully.",
            user,
            success: true
        });

    } catch (error) {
        console.log(error);
    }
};