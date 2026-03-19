"use client";
import { useCallback, useRef, useState } from "react";
import { ActionIcon, Box, Avatar, Button, Group, Modal, Slider, Stack, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCamera, IconCheck, IconX } from "@tabler/icons-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { colors } from "@/ui/tokens";

// ── Canvas helper — extracts the cropped region as a JPEG Blob ───────────────

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageSrc;
    });

    const canvas = document.createElement("canvas");
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y,
        pixelCrop.width, pixelCrop.height,
        0, 0,
        pixelCrop.width, pixelCrop.height,
    );

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Canvas produced no data"))),
            "image/jpeg",
            0.92,
        );
    });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AvatarUploadProps {
    /** Current photo URL from Firebase Auth */
    src: string | null | undefined;
    /** Fallback initials when no photo exists */
    name: string;
    /** Called with the new photo URL after a successful upload */
    onUpdated?: (url: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AvatarUpload({ src, name, onUpdated }: Readonly<AvatarUploadProps>) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [hovered, setHovered] = useState(false);

    // Raw image selected by the user (data-URL)
    const [rawSrc, setRawSrc] = useState<string | null>(null);

    // Cropper state
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const [uploading, setUploading] = useState(false);

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const openFilePicker = () => fileInputRef.current?.click();

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setRawSrc(reader.result as string);
        reader.readAsDataURL(file);
        // Reset so the same file can be picked again later
        e.target.value = "";
    };

    const closeModal = () => {
        if (uploading) return;
        setRawSrc(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
    };

    const handleSave = async () => {
        if (!rawSrc || !croppedAreaPixels) return;
        setUploading(true);
        try {
            const blob = await getCroppedBlob(rawSrc, croppedAreaPixels);

            const formData = new FormData();
            formData.append("file", blob, "profile.jpg");

            const res = await fetch("/api/profile/avatar", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const { message } = (await res.json()) as { message?: string };
                throw new Error(message ?? "Upload failed");
            }

            const { photoURL } = (await res.json()) as { photoURL: string };

            notifications.show({
                title: "Profile picture updated",
                message: "Your new photo has been saved.",
                color: colors.success,
                icon: <IconCheck size={18} />,
            });

            onUpdated?.(photoURL);
            closeModal();
        } catch (err) {
            notifications.show({
                title: "Upload failed",
                message: err instanceof Error ? err.message : String(err),
                color: "red",
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={onFileChange}
            />

            {/* Clickable avatar with camera overlay */}
            <Tooltip label="Change profile picture" withArrow>
                <Box
                    pos="relative"
                    style={{ display: "inline-block", cursor: "pointer" }}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    onClick={openFilePicker}
                >
                    <Avatar
                        src={src}
                        size={68}
                        radius={9999}
                        color="primary"
                        style={{
                            marginTop: -34,
                            border: "3px solid light-dark(white, var(--mantine-color-dark-7))",
                        }}
                        name={name}
                    >
                    </Avatar>

                    {/* Hover overlay */}
                    {hovered && (
                        <Box
                            pos="absolute"
                            style={{
                                inset: 0,
                                marginTop: -34,
                                borderRadius: "50%",
                                background: "rgba(0,0,0,0.5)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                pointerEvents: "none",
                            }}
                        >
                            <IconCamera size={20} color="white" />
                        </Box>
                    )}
                </Box>
            </Tooltip>

            {/* Crop modal */}
            <Modal
                opened={!!rawSrc}
                onClose={closeModal}
                title="Crop profile picture"
                centered
                size="sm"
                closeOnClickOutside={!uploading}
                closeOnEscape={!uploading}
                withCloseButton={!uploading}
            >
                <Stack gap="md">
                    {/* Cropper canvas */}
                    <Box
                        style={{
                            position: "relative",
                            height: 320,
                            borderRadius: "var(--mantine-radius-md)",
                            overflow: "hidden",
                            background: "var(--mantine-color-dark-9)",
                        }}
                    >
                        {rawSrc && (
                            <Cropper
                                image={rawSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                objectFit="cover"
                                cropSize={{ width: 256, height: 256 }}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        )}
                    </Box>

                    {/* Zoom slider */}
                    <Stack gap={4}>
                        <Text size="xs" c="dimmed">Zoom</Text>
                        <Slider
                            min={1}
                            max={3}
                            step={0.01}
                            value={zoom}
                            onChange={setZoom}
                        />
                    </Stack>

                    {/* Actions */}
                    <Group justify="flex-end" gap="sm">
                        <Button
                            variant="default"
                            leftSection={<IconX size={16} />}
                            onClick={closeModal}
                            disabled={uploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            leftSection={<IconCheck size={16} />}
                            onClick={handleSave}
                            loading={uploading}
                        >
                            Save
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}
