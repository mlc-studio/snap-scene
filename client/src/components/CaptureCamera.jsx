import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

const CaptureCamera = forwardRef(({ onPhotoTaken }, ref) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false
        })
            .then(stream => {
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch(err => console.error('Error accessing webcam:', err));

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const capturePhoto = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);

            const photoData = canvasRef.current.toDataURL('image/jpeg', 0.8);
            onPhotoTaken(photoData);
        }
    }, [onPhotoTaken]);

    useImperativeHandle(ref, () => ({
        capturePhoto
    }));

    return (
        <div className="relative">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
            />
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
});

CaptureCamera.displayName = 'CaptureCamera';

export default CaptureCamera;