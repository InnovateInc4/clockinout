import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = ({ onRegisterSuccess, showAlert }) => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
    name: "",
    surname: "",
    idNumber: "",
    phone: "",
    email: "",
    password: "",
    role: "employee",
    department: "General",
    position: ""
});

    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const videoRef = useRef(null);
    const mediaStreamRef = useRef(null);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const triggerAlert = (msg, type = "info") => {
        if (typeof showAlert === "function") {
            showAlert(msg, type);
        } else {
            alert(msg);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            mediaStreamRef.current = stream;
            setIsCameraActive(true);
            setTimeout(() => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            }, 200);
        } catch (err) {
            triggerAlert("Camera access denied or unavailable", "danger");
        }
    };

    const stopCamera = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        const photoData = canvas.toDataURL("image/jpeg", 0.3);
        setCapturedPhoto(photoData);
        stopCamera();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!capturedPhoto) {
            triggerAlert("Please take a facial registration photo before proceeding.", "warning");
            return;
        }

        setIsSubmitting(true);
        
        // Payload matching MySQL fields
        const payload = {
    fullName: `${formData.name} ${formData.surname}`.trim(),

    name: formData.name,
    surname: formData.surname,

    idNumber: formData.idNumber,
    phone: formData.phone,

    email: formData.email,
    userEmail: formData.email,

    password: formData.password,

    // Employees register as employees.
    // Management accounts should be created/approved separately.
    role: "employee",

    department: formData.department,
    position: formData.position,

    faceReferenceImage: capturedPhoto,
    profile_photo: capturedPhoto
};

        try {
            const res = await axios.post("http://localhost:5000/api/auth/register", payload);
            
            triggerAlert("Registration successful! Redirecting to login...", "success");

            if (typeof onRegisterSuccess === "function") {
                onRegisterSuccess(res.data);
            }

            setTimeout(() => {
                navigate("/login-admin");
            }, 1000);

        } catch (err) {
            console.error("Registration submit error:", err.response?.data || err.message);
            const serverMessage = err.response?.data?.message || err.message || "Registration failed. Try again.";
            triggerAlert(serverMessage, "danger");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            maxWidth: "520px",
            margin: "40px auto",
            padding: "36px",
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(16px)",
            border: "1px solid #e2e8f0",
            boxShadow: "0 20px 40px rgba(0,0,0,0.06)",
            fontFamily: '"Inter", system-ui, sans-serif'
        }}>
            <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#0f172a", margin: "0 0 6px 0" }}>
                Create Your Account
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 24px 0" }}>
                Register your details and enroll your face for secure biometric verification.
            </p>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontWeight: "700", fontSize: "0.85rem", color: "#334155", marginBottom: "6px" }}>
                        Full Name
                    </label>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. John Doe"
                        style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                    />
                </div>

                {/* FIRST NAME */}

<div style={{ marginBottom: "16px" }}>
    <label style={{
        display: "block",
        fontWeight: "700",
        fontSize: "0.85rem",
        color: "#334155",
        marginBottom: "6px"
    }}>
        First Name
    </label>

    <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        required
        placeholder="e.g. John"
        style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            boxSizing: "border-box"
        }}
    />
</div>


{/* SURNAME */}

<div style={{ marginBottom: "16px" }}>
    <label style={{
        display: "block",
        fontWeight: "700",
        fontSize: "0.85rem",
        color: "#334155",
        marginBottom: "6px"
    }}>
        Surname
    </label>

    <input
        type="text"
        name="surname"
        value={formData.surname}
        onChange={handleInputChange}
        required
        placeholder="e.g. Doe"
        style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            boxSizing: "border-box"
        }}
    />
</div>


{/* ID NUMBER */}

<div style={{ marginBottom: "16px" }}>
    <label style={{
        display: "block",
        fontWeight: "700",
        fontSize: "0.85rem",
        color: "#334155",
        marginBottom: "6px"
    }}>
        ID / Employee Number
    </label>

    <input
        type="text"
        name="idNumber"
        value={formData.idNumber}
        onChange={handleInputChange}
        required
        placeholder="e.g. 9001011234567"
        style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            boxSizing: "border-box"
        }}
    />
</div>


{/* PHONE */}

<div style={{ marginBottom: "16px" }}>
    <label style={{
        display: "block",
        fontWeight: "700",
        fontSize: "0.85rem",
        color: "#334155",
        marginBottom: "6px"
    }}>
        Phone Number
    </label>

    <input
        type="tel"
        name="phone"
        value={formData.phone}
        onChange={handleInputChange}
        required
        placeholder="e.g. 082 123 4567"
        style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            boxSizing: "border-box"
        }}
    />
</div>


{/* EMAIL */}

<div style={{ marginBottom: "16px" }}>
    <label style={{
        display: "block",
        fontWeight: "700",
        fontSize: "0.85rem",
        color: "#334155",
        marginBottom: "6px"
    }}>
        Email / Username
    </label>

    <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleInputChange}
        required
        placeholder="name@organization.gov.za"
        style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            boxSizing: "border-box"
        }}
    />
</div>


{/* DEPARTMENT */}

<div style={{ marginBottom: "16px" }}>
    <label style={{
        display: "block",
        fontWeight: "700",
        fontSize: "0.85rem",
        color: "#334155",
        marginBottom: "6px"
    }}>
        Department
    </label>

    <input
        type="text"
        name="department"
        value={formData.department}
        onChange={handleInputChange}
        required
        placeholder="e.g. Finance"
        style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            boxSizing: "border-box"
        }}
    />
</div>


{/* GOVERNMENT POSITION */}

<div style={{ marginBottom: "16px" }}>
    <label style={{
        display: "block",
        fontWeight: "700",
        fontSize: "0.85rem",
        color: "#334155",
        marginBottom: "6px"
    }}>
        Government Position
    </label>

    <input
        type="text"
        name="position"
        value={formData.position}
        onChange={handleInputChange}
        required
        placeholder="e.g. Administrative Clerk"
        style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            boxSizing: "border-box"
        }}
    />
</div>


{/* PASSWORD */}

<div style={{ marginBottom: "20px" }}>
    <label style={{
        display: "block",
        fontWeight: "700",
        fontSize: "0.85rem",
        color: "#334155",
        marginBottom: "6px"
    }}>
        Password
    </label>

    <input
        type="password"
        name="password"
        value={formData.password}
        onChange={handleInputChange}
        required
        placeholder="••••••••"
        style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            boxSizing: "border-box"
        }}
    />
</div>

                {/* BIOMETRIC ENROLLMENT CARD */}
                <div style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "20px",
                    textAlign: "center",
                    marginBottom: "24px"
                }}>
                    <div style={{ fontWeight: "800", fontSize: "0.88rem", color: "#0f172a", marginBottom: "12px" }}>
                        Biometric Profile Setup
                    </div>

                    {capturedPhoto ? (
                        <div>
                            <img
                                src={capturedPhoto}
                                alt="Facial Profile"
                                style={{ width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover", border: "3px solid #10b981", marginBottom: "12px" }}
                            />
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setCapturedPhoto(null)}
                                    style={{ background: "none", border: "none", color: "#ea580c", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}
                                >
                                    Retake Photo
                                </button>
                            </div>
                        </div>
                    ) : isCameraActive ? (
                        <div>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{ width: "180px", height: "180px", borderRadius: "50%", objectFit: "cover", border: "3px solid #ea580c", marginBottom: "12px" }}
                            />
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    style={{ padding: "8px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    style={{ padding: "8px 16px", borderRadius: "10px", border: "none", background: "#ea580c", color: "#fff", fontWeight: "700", cursor: "pointer" }}
                                >
                                    Capture
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "12px" }}>
                                Take a clear photo facing the camera. This photo will be saved to verify your attendance logins.
                            </p>
                            <button
                                type="button"
                                onClick={startCamera}
                                style={{
                                    padding: "10px 20px",
                                    borderRadius: "12px",
                                    border: "1px solid #ea580c",
                                    backgroundColor: "#fff7ed",
                                    color: "#ea580c",
                                    fontWeight: "800",
                                    cursor: "pointer"
                                }}
                            >
                                📸 Open Camera
                            </button>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                        width: "100%",
                        padding: "16px",
                        borderRadius: "14px",
                        border: "none",
                        backgroundColor: "#ea580c",
                        color: "#ffffff",
                        fontWeight: "800",
                        fontSize: "1rem",
                        cursor: isSubmitting ? "not-allowed" : "pointer"
                    }}
                >
                    {isSubmitting ? "Registering..." : "Complete Registration"}
                </button>
            </form>
        </div>
    );
};

export default Register;