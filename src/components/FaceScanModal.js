import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';

const FaceScanModal = ({ onVerifySuccess, onClose }) => {
    const videoRef = useRef(null);
    const [scanStatus, setScanStatus] = useState('Loading Face Detection Models...');
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);

    useEffect(() => {
        const loadModels = async () => {
            try {
                // Load model binaries from the public folder
                await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
                await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
                await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

                setIsModelsLoaded(true);
                setScanStatus('Position your face in front of the camera...');
                startVideo();
            } catch (err) {
                setScanStatus('Failed to load face detection models.');
                console.error(err);
            }
        };

        loadModels();

        return () => {
            stopVideo();
        };
    }, []);

    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch(err => setScanStatus('Camera permission denied or unavailable.'));
    };

    const stopVideo = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
    };

    const handleScan = async () => {
        if (!videoRef.current) return;
        setScanStatus('Scanning face...');

        // Detect single face with landmarks and descriptor
        const detection = await faceapi.detectSingleFace(videoRef.current)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            setScanStatus('No face detected. Please align yourself and try again.');
            return;
        }

        // Verify face logic (e.g., compare detection.descriptor against user's stored descriptor)
        // For demonstration, detecting a valid human face fulfills verification
        setScanStatus('Face Verified Successfully! ✅');
        setTimeout(() => {
            stopVideo();
            onVerifySuccess(detection.descriptor);
        }, 1000);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000
        }}>
            <div style={{
                backgroundColor: '#ffffff', borderRadius: '20px', padding: '30px',
                maxWidth: '500px', width: '90%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontWeight: '800' }}>Biometric Face Verification</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '20px' }}>{scanStatus}</p>

                <div style={{ position: 'relative', width: '100%', height: '300px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000', marginBottom: '20px' }}>
                    <video ref={videoRef} autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleScan}
                        disabled={!isModelsLoaded}
                        style={{
                            flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                            backgroundColor: '#ea580c', color: 'white', fontWeight: '800',
                            cursor: isModelsLoaded ? 'pointer' : 'not-allowed', opacity: isModelsLoaded ? 1 : 0.6
                        }}
                    >
                        SCAN & CLOCK IN
                    </button>
                    <button
                        onClick={() => { stopVideo(); onClose(); }}
                        style={{
                            padding: '14px 20px', borderRadius: '10px', border: '1px solid #cbd5e1',
                            backgroundColor: 'white', color: '#334155', fontWeight: '700', cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FaceScanModal;