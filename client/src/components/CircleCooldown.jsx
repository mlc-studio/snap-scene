import React, { useEffect, useState } from 'react';

const CircleCooldown = ({ timeRemaining, totalTime }) => {
    const [dashOffset, setDashOffset] = useState(0);

    // SVG circle properties
    const size = 30;
    const strokeWidth = 2;
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;

    useEffect(() => {
        const offset = ((totalTime - timeRemaining) / totalTime) * circumference;
        setDashOffset(offset);
    }, [timeRemaining, totalTime, circumference]);

    // Calculate remaining seconds
    const seconds = Math.ceil(timeRemaining / 1000);

    if (timeRemaining && totalTime) return (
        <div className="relative inline-flex items-center justify-center">
            <svg className="transform -rotate-90" width={size} height={size}>
                {/* Background circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    className="stroke-gray-200"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    className="stroke-blue-500 transition-all duration-300 ease-linear"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    fill="none"
                />
            </svg>
            {/* Timer text */}
            <div className="absolute text font-semibold">
                {seconds}
            </div>
        </div>
    );
};

export default CircleCooldown;