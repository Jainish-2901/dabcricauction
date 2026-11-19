import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Crop } from 'lucide-react';
import toast from '../lib/toast';

const ImageCropModal = ({
    isOpen,
    imageSrc,
    onCropComplete,
    onCropDone,
    onClose,
    title = 'Crop Image (1:1 Square)',
    outputSize = 512
}) => {
    const handleCropCallback = onCropComplete || onCropDone;
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageLoaded, setImageLoaded] = useState(false);

    const imageRef = useRef(null);
    const containerRef = useRef(null);

    const CROP_BOX_SIZE = 280; // Displayed size of the 1:1 crop window

    // Reset transformations when image changes or modal opens
    useEffect(() => {
        if (isOpen && imageSrc) {
            setZoom(1);
            setRotation(0);
            setPan({ x: 0, y: 0 });
            setImageLoaded(true);
        }
    }, [isOpen, imageSrc]);

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    }, [isDragging, dragStart]);

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Touch events for mobile responsiveness on web
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            setIsDragging(true);
            setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
        }
    };

    const handleTouchMove = (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        const touch = e.touches[0];
        setPan({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y
        });
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    const handleCrop = () => {
        if (!imageRef.current) return;
        const img = imageRef.current;
        if (!img.naturalWidth || !img.naturalHeight) {
            toast.warning('Image has not finished loading. Please wait a moment and try again.');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Fill white background for transparent PNGs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outputSize, outputSize);

        // Calculate scaling from displayed CROP_BOX_SIZE to outputSize
        const scaleFactor = outputSize / CROP_BOX_SIZE;

        ctx.save();
        // Move origin to center of output canvas
        ctx.translate(outputSize / 2, outputSize / 2);

        // Apply pan scaled
        ctx.translate(pan.x * scaleFactor, pan.y * scaleFactor);

        // Apply rotation
        ctx.rotate((rotation * Math.PI) / 180);

        // Draw image scaled by zoom
        const imgW = img.width || img.naturalWidth || CROP_BOX_SIZE;
        const imgH = img.height || img.naturalHeight || CROP_BOX_SIZE;
        const imgDisplayWidth = imgW * zoom * scaleFactor;
        const imgDisplayHeight = imgH * zoom * scaleFactor;

        ctx.drawImage(
            img,
            -imgDisplayWidth / 2,
            -imgDisplayHeight / 2,
            imgDisplayWidth,
            imgDisplayHeight
        );

        ctx.restore();

        let croppedBase64 = imageSrc;
        try {
            croppedBase64 = canvas.toDataURL('image/jpeg', 0.88);
        } catch (e) {
            console.warn('Canvas export failed, using original source:', e);
            croppedBase64 = imageSrc;
        }

        try {
            if (typeof handleCropCallback === 'function') {
                handleCropCallback(croppedBase64);
            }
        } catch (err) {
            console.error('Error invoking crop callback:', err);
        }

        if (typeof onClose === 'function') {
            onClose();
        }
    };

    if (!isOpen || !imageSrc) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs font-sans">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                            <Crop className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900">{title}</h3>
                            <p className="text-[10px] text-slate-500 font-bold">Pan & Zoom to fit 1:1 frame</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Viewport & Crop Frame Area */}
                <div
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="relative w-full h-[330px] bg-slate-950 flex items-center justify-center overflow-hidden select-none cursor-move"
                >
                    {/* The Image being transformed */}
                    <img
                        ref={imageRef}
                        src={imageSrc}
                        alt="Crop Source"
                        crossOrigin={imageSrc && imageSrc.startsWith('http') ? 'anonymous' : undefined}
                        onLoad={() => setImageLoaded(true)}
                        onError={(e) => console.error('Failed to load image in crop modal:', e)}
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleTouchStart}
                        draggable={false}
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                            transformOrigin: 'center center',
                            maxWidth: `${CROP_BOX_SIZE}px`,
                            maxHeight: `${CROP_BOX_SIZE}px`,
                            width: 'auto',
                            height: 'auto',
                            display: 'block',
                            transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                            userSelect: 'none'
                        }}
                        className="pointer-events-auto shrink-0 select-none"
                    />

                    {/* Dark Mask with 1:1 Center Cutout */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div
                            style={{ width: `${CROP_BOX_SIZE}px`, height: `${CROP_BOX_SIZE}px` }}
                            className="border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] rounded-2xl relative"
                        >
                            {/* Rule of Thirds Grid Lines */}
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                                <div className="border-r border-b border-white" />
                                <div className="border-r border-b border-white" />
                                <div className="border-b border-white" />
                                <div className="border-r border-b border-white" />
                                <div className="border-r border-b border-white" />
                                <div className="border-b border-white" />
                                <div className="border-r border-white" />
                                <div className="border-r border-white" />
                                <div />
                            </div>

                            {/* 1:1 Frame Badge */}
                            <div className="absolute -top-3 left-3 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-md uppercase tracking-wider shadow-sm">
                                1:1 Square Frame
                            </div>
                        </div>
                    </div>
                </div>

                {/* Control Tools Strip */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                    {/* Zoom Slider */}
                    <div className="flex items-center gap-3">
                        <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            type="range"
                            min="0.8"
                            max="3"
                            step="0.05"
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                        />
                        <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
                        <button
                            type="button"
                            onClick={handleRotate}
                            className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-600 shadow-2xs transition-all ml-1"
                            title="Rotate 90°"
                        >
                            <RotateCw className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => {
                                onCropComplete(imageSrc);
                                onClose();
                            }}
                            className="flex-1 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all"
                            title="Skip cropping and use the photo as-is"
                        >
                            Use Original
                        </button>
                        <button
                            type="button"
                            onClick={handleCrop}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                        >
                            <Check className="w-3.5 h-3.5" />
                            <span>Done (Crop 1:1)</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropModal;

