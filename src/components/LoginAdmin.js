import React, { useState } from "react";
import axios from "axios";


const LoginAdmin = ({
    onLoginSuccess,
    switchToRegister,
    showAlert
}) => {

    // ======================================================
    // STATE
    // ======================================================

    const [credentials, setCredentials] = useState({
        email: "",
        password: ""
    });


    // If the previous session expired,
    // show the message immediately.
    const [
        sessionExpiredMessage,
        setSessionExpiredMessage
    ] = useState(() => {

        return (
            sessionStorage.getItem(
                "sessionExpired"
            ) === "true"
        );

    });


    const [isLoading, setIsLoading] =
        useState(false);

    const [error, setError] =
        useState("");


    // ======================================================
    // HANDLE INPUT CHANGE
    // ======================================================

    const handleChange = (e) => {

        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        });


        if (error) {

            setError("");

        }

    };


    // ======================================================
    // LOGIN
    // ======================================================

    const handleLogin = async (e) => {

        e.preventDefault();


        setError("");

        setIsLoading(
            true
        );


        try {

            const res =
                await axios.post(
                    "/api/auth/login-admin",
                    {
                        email:
                            credentials.email.trim(),

                        password:
                            credentials.password
                    }
                );


            // ==================================================
            // CHECK RESPONSE
            // ==================================================

            if (
                !res.data ||
                !res.data.success
            ) {

                setError(
                    res.data?.message ||
                    "Invalid credentials."
                );

                return;

            }


            const user =
                res.data.user;

            const token =
                res.data.token;


            if (!user) {

                setError(
                    "Login succeeded, but no user information was returned."
                );

                return;

            }


            if (!token) {

                setError(
                    "Login succeeded, but no authentication token was returned."
                );

                return;

            }


            // ==================================================
            // SAVE USER INFORMATION
            // ==================================================

            sessionStorage.setItem(
                "userId",
                String(user.id)
            );


            sessionStorage.setItem(
                "userEmail",
                user.email || ""
            );


            sessionStorage.setItem(
                "userRole",
                user.role || "employee"
            );


            sessionStorage.setItem(
                "userName",
                `${user.name || ""} ${user.surname || ""}`.trim()
            );


            // ==================================================
            // SAVE JWT TOKEN
            // ==================================================

            sessionStorage.setItem(
                "authToken",
                token
            );


            sessionStorage.setItem(
                "token",
                token
            );


            // ==================================================
            // ROLE
            // ==================================================

            const normalizedRole =
                (
                    user.role ||
                    "employee"
                ).toLowerCase();


            if (
                normalizedRole === "admin" ||
                normalizedRole === "manager"
            ) {

                sessionStorage.setItem(
                    "isManager",
                    "true"
                );

            } else {

                sessionStorage.removeItem(
                    "isManager"
                );

            }


            // ==================================================
            // SESSION IS NOW VALID AGAIN
            // ==================================================

            sessionStorage.removeItem(
                "sessionExpired"
            );


            setSessionExpiredMessage(
                false
            );


            // ==================================================
            // SUCCESS MESSAGE
            // ==================================================

            if (
                typeof showAlert ===
                "function"
            ) {

                showAlert(
                    `Welcome back, ${
                        user.name ||
                        user.email
                    }!`,
                    "success"
                );

            }


            // ==================================================
            // SEND LOGIN RESULT TO APP.JS
            // ==================================================

            if (
                typeof onLoginSuccess ===
                "function"
            ) {

                onLoginSuccess(
                    user
                );

            }


        } catch (err) {

            console.error(
                "❌ Login error:",
                err.response?.data ||
                err.message
            );


            if (
                err.response?.data?.message
            ) {

                setError(
                    err.response.data.message
                );

            }

            else if (
                err.code ===
                "ERR_NETWORK"
            ) {

                setError(
                    "Cannot connect to the server. Please make sure the backend is running."
                );

            }

            else {

                setError(
                    "Invalid credentials."
                );

            }


        } finally {

            setIsLoading(
                false
            );

        }

    };


    // ======================================================
    // PAGE
    // ======================================================

    return (

    <div
        style={{
            minHeight: "100vh",
            width: "100%",
            background:
                "linear-gradient(135deg, #eef2f6 0%, #f8fafc 48%, #fff7ed 100%)",
            fontFamily:
                '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            position: "relative",
            overflow: "hidden",
            boxSizing: "border-box"
        }}
    >

        {/* ================================================= */}
        {/* BACKGROUND DECORATION */}
        {/* ================================================= */}

        <div
            style={{
                position: "absolute",
                top: "-180px",
                left: "-180px",
                width: "500px",
                height: "500px",
                borderRadius: "50%",
                background:
                    "rgba(15, 23, 42, 0.035)"
            }}
        />

        <div
            style={{
                position: "absolute",
                right: "-140px",
                bottom: "-180px",
                width: "480px",
                height: "480px",
                borderRadius: "50%",
                background:
                    "rgba(249, 115, 22, 0.07)"
            }}
        />


        {/* ================================================= */}
        {/* GOVERNMENT SECURITY BAR */}
        {/* ================================================= */}

        <div
            style={{
                width: "100%",
                background: "#0f172a",
                color: "#ffffff",
                padding: "10px 28px",
                boxSizing: "border-box",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "20px",
                flexWrap: "wrap",
                position: "relative",
                zIndex: 2
            }}
        >

            <div
                style={{
                    fontSize: "0.72rem",
                    fontWeight: "900",
                    letterSpacing: "1px",
                    textTransform: "uppercase"
                }}
            >
                Official Government System
            </div>

            <div
                style={{
                    fontSize: "0.72rem",
                    color: "#cbd5e1",
                    fontWeight: "700"
                }}
            >
                Authorised Personnel Only
            </div>

        </div>


        {/* ================================================= */}
        {/* MAIN LOGIN AREA */}
        {/* ================================================= */}

        <div
            style={{
                minHeight: "calc(100vh - 40px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "45px 24px",
                boxSizing: "border-box",
                position: "relative",
                zIndex: 1
            }}
        >

            <div
                style={{
                    width: "100%",
                    maxWidth: "1180px",
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(340px, 1fr))",
                    background: "#ffffff",
                    borderRadius: "26px",
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                    boxShadow:
                        "0 30px 80px rgba(15, 23, 42, 0.14)"
                }}
            >


                {/* ================================================= */}
                {/* LEFT - GOVERNMENT IDENTITY */}
                {/* ================================================= */}

                <div
                    style={{
                        background:
                            "linear-gradient(145deg, #0f172a 0%, #172033 55%, #1e293b 100%)",
                        color: "#ffffff",
                        padding: "58px 52px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        minHeight: "560px",
                        boxSizing: "border-box",
                        position: "relative",
                        overflow: "hidden"
                    }}
                >

                    <div
                        style={{
                            position: "absolute",
                            width: "300px",
                            height: "300px",
                            borderRadius: "50%",
                            border:
                                "1px solid rgba(255,255,255,0.06)",
                            right: "-120px",
                            top: "-80px"
                        }}
                    />


                    <div>

                        {/* PROVINCIAL MARK */}

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "16px",
                                marginBottom: "50px"
                            }}
                        >

                            <div
    style={{
        width: "86px",
        height: "86px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
    }}
>
    <img
        src="https://www.loeser.us/flags/images/south_africa/provincial/northern_cape_arms.jpg"
        alt="Northern Cape Provincial Coat of Arms"
        style={{
            width: "86px",
            height: "86px",
            objectFit: "contain",
            borderRadius: "8px"
        }}
    />
</div>


                            <div>

                                <div
                                    style={{
                                        fontSize: "0.72rem",
                                        fontWeight: "900",
                                        letterSpacing: "1.3px",
                                        color: "#fdba74",
                                        textTransform: "uppercase",
                                        marginBottom: "4px"
                                    }}
                                >
                                    Northern Cape
                                </div>

                                <div
                                    style={{
                                        fontWeight: "900",
                                        fontSize: "1rem",
                                        letterSpacing: "0.4px"
                                    }}
                                >
                                    Provincial Government
                                </div>

                            </div>

                        </div>


                        <div
                            style={{
                                display: "inline-block",
                                padding: "7px 12px",
                                borderRadius: "999px",
                                border:
                                    "1px solid rgba(249,115,22,0.35)",
                                background:
                                    "rgba(249,115,22,0.10)",
                                color: "#fdba74",
                                fontSize: "0.7rem",
                                fontWeight: "900",
                                letterSpacing: "1px",
                                textTransform: "uppercase",
                                marginBottom: "20px"
                            }}
                        >
                            Office of the Premier
                        </div>


                        <h1
                            style={{
                                margin: 0,
                                fontSize: "2.65rem",
                                lineHeight: "1.08",
                                fontWeight: "900",
                                letterSpacing: "-0.04em",
                                maxWidth: "520px"
                            }}
                        >
                            Employee Management
                            <br />
                            & Attendance System
                        </h1>


                        <p
                            style={{
                                color: "#cbd5e1",
                                maxWidth: "500px",
                                lineHeight: "1.7",
                                fontSize: "0.98rem",
                                margin:
                                    "24px 0 0 0"
                            }}
                        >
                            Secure workforce administration,
                            attendance monitoring and employee
                            management for authorised provincial
                            government personnel.
                        </p>

                    </div>


                    {/* SYSTEM INFO */}

                    <div>

                        <div
                            style={{
                                borderTop:
                                    "1px solid rgba(255,255,255,0.12)",
                                paddingTop: "24px",
                                display: "grid",
                                gap: "12px"
                            }}
                        >

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    fontSize: "0.82rem",
                                    color: "#cbd5e1"
                                }}
                            >
                                <span
                                    style={{
                                        color: "#22c55e"
                                    }}
                                >
                                    ●
                                </span>

                                Secure authenticated access
                            </div>


                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    fontSize: "0.82rem",
                                    color: "#cbd5e1"
                                }}
                            >
                                <span
                                    style={{
                                        color: "#f97316"
                                    }}
                                >
                                    ◆
                                </span>

                                Employee and management access
                            </div>


                            <div
                                style={{
                                    fontSize: "0.72rem",
                                    color: "#64748b",
                                    marginTop: "8px"
                                }}
                            >
                                Northern Cape Provincial Government
                                · Office of the Premier
                            </div>

                        </div>

                    </div>

                </div>


                {/* ================================================= */}
                {/* RIGHT - LOGIN */}
                {/* ================================================= */}

                <div
                    style={{
                        padding: "58px 52px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        background:
                            "rgba(255,255,255,0.98)",
                        boxSizing: "border-box"
                    }}
                >

                    <div
                        style={{
                            maxWidth: "430px",
                            width: "100%",
                            margin: "0 auto"
                        }}
                    >

                        <div
                            style={{
                                color: "#ea580c",
                                fontWeight: "900",
                                fontSize: "0.72rem",
                                letterSpacing: "1.2px",
                                textTransform: "uppercase",
                                marginBottom: "10px"
                            }}
                        >
                            Secure Staff Access
                        </div>


                        <h2
                            style={{
                                margin: 0,
                                color: "#0f172a",
                                fontSize: "2rem",
                                fontWeight: "900",
                                letterSpacing: "-0.025em"
                            }}
                        >
                            Sign in to your account
                        </h2>


                        <p
                            style={{
                                margin:
                                    "10px 0 32px 0",
                                color: "#64748b",
                                fontSize: "0.9rem",
                                lineHeight: "1.6"
                            }}
                        >
                            Enter your registered government
                            account details to continue.
                        </p>


                        {/* SESSION EXPIRED */}

                        {sessionExpiredMessage && (

                            <div
                                style={{
                                    padding: "13px 15px",
                                    borderRadius: "10px",
                                    background: "#fff7ed",
                                    border:
                                        "1px solid #fed7aa",
                                    color: "#c2410c",
                                    fontSize: "0.82rem",
                                    fontWeight: "700",
                                    marginBottom: "18px"
                                }}
                            >
                                Your previous session expired.
                                Please sign in again.
                            </div>

                        )}


                        {/* ERROR */}

                        {error && (

                            <div
                                style={{
                                    padding: "13px 15px",
                                    borderRadius: "10px",
                                    background: "#fef2f2",
                                    border:
                                        "1px solid #fecaca",
                                    color: "#b91c1c",
                                    fontSize: "0.82rem",
                                    fontWeight: "700",
                                    marginBottom: "18px"
                                }}
                            >
                                {error}
                            </div>

                        )}


                        <form onSubmit={handleLogin}>

                            {/* EMAIL */}

                            <div
                                style={{
                                    marginBottom: "19px"
                                }}
                            >

                                <label
                                    style={{
                                        display: "block",
                                        color: "#334155",
                                        fontSize: "0.8rem",
                                        fontWeight: "800",
                                        marginBottom: "8px"
                                    }}
                                >
                                    Government Email Address
                                </label>


                                <input
                                    type="email"
                                    name="email"
                                    value={credentials.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="name@ncpg.gov.za"
                                    autoComplete="email"
                                    style={{
                                        width: "100%",
                                        padding: "14px 15px",
                                        borderRadius: "10px",
                                        border:
                                            "1px solid #cbd5e1",
                                        background: "#ffffff",
                                        boxSizing: "border-box",
                                        outline: "none",
                                        fontSize: "0.92rem",
                                        color: "#0f172a"
                                    }}
                                    onFocus={(event) => {
                                        event.target.style.borderColor =
                                            "#f97316";

                                        event.target.style.boxShadow =
                                            "0 0 0 3px rgba(249,115,22,0.10)";
                                    }}
                                    onBlur={(event) => {
                                        event.target.style.borderColor =
                                            "#cbd5e1";

                                        event.target.style.boxShadow =
                                            "none";
                                    }}
                                />

                            </div>


                            {/* PASSWORD */}

                            <div
                                style={{
                                    marginBottom: "24px"
                                }}
                            >

                                <label
                                    style={{
                                        display: "block",
                                        color: "#334155",
                                        fontSize: "0.8rem",
                                        fontWeight: "800",
                                        marginBottom: "8px"
                                    }}
                                >
                                    Password
                                </label>


                                <input
                                    type="password"
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    style={{
                                        width: "100%",
                                        padding: "14px 15px",
                                        borderRadius: "10px",
                                        border:
                                            "1px solid #cbd5e1",
                                        background: "#ffffff",
                                        boxSizing: "border-box",
                                        outline: "none",
                                        fontSize: "0.92rem",
                                        color: "#0f172a"
                                    }}
                                    onFocus={(event) => {
                                        event.target.style.borderColor =
                                            "#f97316";

                                        event.target.style.boxShadow =
                                            "0 0 0 3px rgba(249,115,22,0.10)";
                                    }}
                                    onBlur={(event) => {
                                        event.target.style.borderColor =
                                            "#cbd5e1";

                                        event.target.style.boxShadow =
                                            "none";
                                    }}
                                />

                            </div>


                            {/* LOGIN BUTTON */}

                            <button
                                type="submit"
                                disabled={isLoading}
                                style={{
                                    width: "100%",
                                    padding: "15px 18px",
                                    borderRadius: "10px",
                                    border: "none",
                                    background:
                                        isLoading
                                            ? "#94a3b8"
                                            : "linear-gradient(135deg, #f97316, #ea580c)",
                                    color: "#ffffff",
                                    fontSize: "0.92rem",
                                    fontWeight: "900",
                                    cursor:
                                        isLoading
                                            ? "not-allowed"
                                            : "pointer",
                                    boxShadow:
                                        isLoading
                                            ? "none"
                                            : "0 8px 20px rgba(249,115,22,0.24)",
                                    letterSpacing: "0.2px"
                                }}
                            >
                                {
                                    isLoading
                                        ? "Authenticating..."
                                        : "Secure Sign In"
                                }
                            </button>

                        </form>


                        {/* SECURITY NOTICE */}

                        <div
                            style={{
                                marginTop: "24px",
                                padding: "14px",
                                borderRadius: "10px",
                                background: "#f8fafc",
                                border:
                                    "1px solid #e2e8f0",
                                display: "flex",
                                gap: "10px",
                                alignItems: "flex-start"
                            }}
                        >

                            <div
                                style={{
                                    fontSize: "0.9rem"
                                }}
                            >
                                🔒
                            </div>


                            <div
                                style={{
                                    color: "#64748b",
                                    fontSize: "0.75rem",
                                    lineHeight: "1.5"
                                }}
                            >
                                Access to this system is restricted
                                to authorised personnel. System
                                activity may be recorded for security
                                and administrative purposes.
                            </div>

                        </div>


                        {/* REGISTER */}

                        <div
                            style={{
                                marginTop: "25px",
                                paddingTop: "20px",
                                borderTop:
                                    "1px solid #e2e8f0",
                                textAlign: "center"
                            }}
                        >

                            <span
                                style={{
                                    color: "#64748b",
                                    fontSize: "0.8rem"
                                }}
                            >
                                New employee?{" "}
                            </span>


                            <button
                                type="button"
                                onClick={switchToRegister}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#ea580c",
                                    fontSize: "0.8rem",
                                    fontWeight: "900",
                                    cursor: "pointer",
                                    padding: 0
                                }}
                            >
                                Register employee account
                            </button>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    </div>

);

};


export default LoginAdmin;