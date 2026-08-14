import { CalendarClock, FileVideo, UploadCloud } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { createPublication } from "../api/publicationApi";
import {
  completeUpload,
  presignUpload,
  uploadFileToPresignedUrl,
} from "../api/uploadApi";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { getApiErrorMessage } from "../api/errorMessage";
import {
  buildCreatePublicationRequest,
  formatFileSize,
  hasCreatePublicationValidationErrors,
  MAX_PUBLICATION_TEXT_LENGTH,
  MAX_PUBLICATION_TITLE_LENGTH,
  MAX_VIDEO_SIZE_BYTES,
  type PlatformSelectionState,
  type PlatformOverrideState,
  validateCreatePublicationForm,
} from "./createPublicationForm";

const CREATE_STEP = {
  IDLE: "idle",
  UPLOADING: "uploading",
  COMPLETING: "completing",
  CREATING: "creating",
  SUCCESS: "success",
  ERROR: "error",
} as const;

type CreateStep = (typeof CREATE_STEP)[keyof typeof CREATE_STEP];

interface InitialSchedule {
  date: string;
  time: string;
}

function getInitialSchedule(): InitialSchedule {
  const scheduledAt = new Date(Date.now() + 60 * 60 * 1000);
  const year = scheduledAt.getFullYear();
  const month = String(scheduledAt.getMonth() + 1).padStart(2, "0");
  const day = String(scheduledAt.getDate()).padStart(2, "0");
  const hours = String(scheduledAt.getHours()).padStart(2, "0");
  const minutes = String(scheduledAt.getMinutes()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

function getStepLabel(step: CreateStep): string {
  if (step === CREATE_STEP.UPLOADING) {
    return "Uploading video";
  }

  if (step === CREATE_STEP.COMPLETING) {
    return "Verifying upload";
  }

  if (step === CREATE_STEP.CREATING) {
    return "Creating publication";
  }

  if (step === CREATE_STEP.SUCCESS) {
    return "Publication created";
  }

  if (step === CREATE_STEP.ERROR) {
    return "Ready to retry";
  }

  return "Ready";
}

export function CreatePage() {
  const navigate = useNavigate();
  const initialSchedule = useMemo(getInitialSchedule, []);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [defaultText, setDefaultText] = useState("");
  const [date, setDate] = useState(initialSchedule.date);
  const [time, setTime] = useState(initialSchedule.time);
  const [platforms, setPlatforms] = useState<PlatformSelectionState>({
    youtube: true,
    instagram: false,
    tiktok: false,
  });
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [overrides, setOverrides] = useState<PlatformOverrideState>({
    youtubeText: "",
    instagramText: "",
    tiktokText: "",
  });
  const [showYoutubeOverride, setShowYoutubeOverride] = useState(false);
  const [showInstagramOverride, setShowInstagramOverride] = useState(false);
  const [showTikTokOverride, setShowTikTokOverride] = useState(false);
  const [step, setStep] = useState<CreateStep>(CREATE_STEP.IDLE);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [wasSubmitted, setWasSubmitted] = useState(false);

  useEffect(() => {
    if (selectedFile === null) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const validationErrors = validateCreatePublicationForm({
    selectedFile,
    defaultText,
    date,
    time,
    platforms,
    youtubeTitle,
    overrides,
  });
  const isBusy =
    step === CREATE_STEP.UPLOADING ||
    step === CREATE_STEP.COMPLETING ||
    step === CREATE_STEP.CREATING;
  const shouldShowValidation = wasSubmitted || formError !== null;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadProgress(0);
    setStep(CREATE_STEP.IDLE);
    setFormError(null);
  };

  const updatePlatform = (
    platform: keyof PlatformSelectionState,
    enabled: boolean,
  ) => {
    setPlatforms((currentPlatforms) => ({
      ...currentPlatforms,
      [platform]: enabled,
    }));
  };

  const updateOverride = (
    platform: keyof PlatformOverrideState,
    value: string,
  ) => {
    setOverrides((currentOverrides) => ({
      ...currentOverrides,
      [platform]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWasSubmitted(true);
    setFormError(null);

    const currentErrors = validateCreatePublicationForm({
      selectedFile,
      defaultText,
      date,
      time,
      platforms,
      youtubeTitle,
      overrides,
    });

    if (hasCreatePublicationValidationErrors(currentErrors)) {
      setFormError("Fix the highlighted fields and try again.");
      setStep(CREATE_STEP.ERROR);
      return;
    }

    if (selectedFile === null) {
      return;
    }

    try {
      setStep(CREATE_STEP.UPLOADING);
      setUploadProgress(0);

      const presignedUpload = await presignUpload({
        filename: selectedFile.name,
        contentType: selectedFile.type,
        sizeBytes: selectedFile.size,
      });

      await uploadFileToPresignedUrl(
        presignedUpload.uploadUrl,
        selectedFile,
        presignedUpload.headers,
        (progressEvent) => {
          if (progressEvent.total === undefined) {
            return;
          }

          setUploadProgress(
            Math.min(100, Math.round((progressEvent.loaded / progressEvent.total) * 100)),
          );
        },
      );
      setUploadProgress(100);

      setStep(CREATE_STEP.COMPLETING);
      const completedUpload = await completeUpload({
        videoR2Key: presignedUpload.videoR2Key,
      });

      const request = buildCreatePublicationRequest({
        videoR2Key: completedUpload.videoR2Key,
        defaultText,
        date,
        time,
        platforms,
        youtubeTitle,
        overrides,
      });

      if (request === null) {
        setFormError("Choose a valid publication date and time.");
        setStep(CREATE_STEP.ERROR);
        return;
      }

      setStep(CREATE_STEP.CREATING);
      const response = await createPublication(request);
      setStep(CREATE_STEP.SUCCESS);
      navigate(`/publication/${response.publication.id}`);
    } catch (error) {
      setFormError(
        getApiErrorMessage(error, "Could not create the publication. Try again."),
      );
      setStep(CREATE_STEP.ERROR);
    }
  };

  return (
    <>
      <PageHeader
        title="Create publication"
        description="Upload one video, choose MVP platforms, and schedule the backend publishing job."
      />

      <form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]" onSubmit={handleSubmit}>
        <div className="space-y-6">
          <section className="rounded-md border border-border p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                <FileVideo className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold">Video</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  MP4, MOV, or WebM up to {formatFileSize(MAX_VIDEO_SIZE_BYTES)}.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <Input
                accept="video/*"
                disabled={isBusy}
                type="file"
                onChange={handleFileChange}
              />
              {(shouldShowValidation || selectedFile !== null) &&
              validationErrors.selectedFile !== undefined ? (
                <p className="mt-2 text-sm text-destructive">
                  {validationErrors.selectedFile}
                </p>
              ) : null}
            </div>

            {selectedFile !== null ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-md border border-border bg-muted p-3 text-sm">
                  <p className="font-medium text-foreground">{selectedFile.name}</p>
                  <p className="mt-1 text-muted-foreground">
                    {formatFileSize(selectedFile.size)} · {selectedFile.type}
                  </p>
                </div>
                {previewUrl !== null ? (
                  <video
                    className="aspect-video w-full rounded-md border border-border bg-black"
                    controls
                    src={previewUrl}
                  />
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-md border border-border p-5">
            <h2 className="text-base font-semibold">Publication text</h2>
            <div className="mt-4">
              <Textarea
                disabled={isBusy}
                maxLength={MAX_PUBLICATION_TEXT_LENGTH}
                placeholder="Write the default text for selected platforms."
                value={defaultText}
                onChange={(event) => setDefaultText(event.target.value)}
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-destructive">
                  {shouldShowValidation ? validationErrors.defaultText : undefined}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {defaultText.trim().length}/{MAX_PUBLICATION_TEXT_LENGTH}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-border p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Schedule</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The selected local time is sent to the API as UTC.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Date
                <Input
                  className="mt-2"
                  disabled={isBusy}
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Time
                <Input
                  className="mt-2"
                  disabled={isBusy}
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </label>
            </div>
            {shouldShowValidation && validationErrors.scheduledAt !== undefined ? (
              <p className="mt-2 text-sm text-destructive">
                {validationErrors.scheduledAt}
              </p>
            ) : null}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-md border border-border p-5">
            <h2 className="text-base font-semibold">Platforms</h2>
            <div className="mt-4 space-y-4">
              <label className="flex items-start gap-3 rounded-md border border-border p-3">
                <input
                  checked={platforms.instagram}
                  className="mt-1 h-4 w-4 accent-primary"
                  disabled={isBusy}
                  type="checkbox"
                  onChange={(event) =>
                    updatePlatform("instagram", event.target.checked)
                  }
                />
                <span>
                  <span className="block text-sm font-medium">Instagram</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Uses the default text unless an override is set.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-md border border-border p-3">
                <input
                  checked={platforms.tiktok}
                  className="mt-1 h-4 w-4 accent-primary"
                  disabled={isBusy}
                  type="checkbox"
                  onChange={(event) =>
                    updatePlatform("tiktok", event.target.checked)
                  }
                />
                <span>
                  <span className="block text-sm font-medium">TikTok</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Uses the default text unless an override is set.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-md border border-border p-3">
                <input
                  checked={platforms.youtube}
                  className="mt-1 h-4 w-4 accent-primary"
                  disabled={isBusy}
                  type="checkbox"
                  onChange={(event) =>
                    updatePlatform("youtube", event.target.checked)
                  }
                />
                <span>
                  <span className="block text-sm font-medium">YouTube</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Requires a title for the upload metadata.
                  </span>
                </span>
              </label>
            </div>
            {shouldShowValidation && validationErrors.platforms !== undefined ? (
              <p className="mt-2 text-sm text-destructive">
                {validationErrors.platforms}
              </p>
            ) : null}
          </section>

          {platforms.youtube ? (
            <section className="rounded-md border border-border p-5">
              <label className="block text-sm font-medium">
                YouTube title
                <Input
                  className="mt-2"
                  disabled={isBusy}
                  maxLength={MAX_PUBLICATION_TITLE_LENGTH}
                  placeholder="Video title"
                  value={youtubeTitle}
                  onChange={(event) => setYoutubeTitle(event.target.value)}
                />
              </label>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-destructive">
                  {shouldShowValidation ? validationErrors.youtubeTitle : undefined}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {youtubeTitle.trim().length}/{MAX_PUBLICATION_TITLE_LENGTH}
                </span>
              </div>
            </section>
          ) : null}

          <section className="rounded-md border border-border p-5">
            <h2 className="text-base font-semibold">Text overrides</h2>
            <div className="mt-4 space-y-3">
              <div>
                <Button
                  className="w-full justify-between"
                  disabled={isBusy}
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setShowInstagramOverride((isShown) => !isShown)
                  }
                >
                  Instagram override
                  <span>{showInstagramOverride ? "Hide" : "Edit"}</span>
                </Button>
                {showInstagramOverride ? (
                  <Textarea
                    className="mt-3 min-h-24"
                    disabled={isBusy}
                    placeholder="Leave empty to use the default text."
                    value={overrides.instagramText}
                    onChange={(event) =>
                      updateOverride("instagramText", event.target.value)
                    }
                  />
                ) : null}
              </div>

              <div>
                <Button
                  className="w-full justify-between"
                  disabled={isBusy}
                  type="button"
                  variant="outline"
                  onClick={() => setShowTikTokOverride((isShown) => !isShown)}
                >
                  TikTok override
                  <span>{showTikTokOverride ? "Hide" : "Edit"}</span>
                </Button>
                {showTikTokOverride ? (
                  <Textarea
                    className="mt-3 min-h-24"
                    disabled={isBusy}
                    placeholder="Leave empty to use the default text."
                    value={overrides.tiktokText}
                    onChange={(event) =>
                      updateOverride("tiktokText", event.target.value)
                    }
                  />
                ) : null}
              </div>

              <div>
                <Button
                  className="w-full justify-between"
                  disabled={isBusy}
                  type="button"
                  variant="outline"
                  onClick={() => setShowYoutubeOverride((isShown) => !isShown)}
                >
                  YouTube override
                  <span>{showYoutubeOverride ? "Hide" : "Edit"}</span>
                </Button>
                {showYoutubeOverride ? (
                  <Textarea
                    className="mt-3 min-h-24"
                    disabled={isBusy}
                    placeholder="Leave empty to use the default text."
                    value={overrides.youtubeText}
                    onChange={(event) =>
                      updateOverride("youtubeText", event.target.value)
                    }
                  />
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-md border border-border p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">{getStepLabel(step)}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Progress {uploadProgress}%
                </p>
              </div>
              <UploadCloud className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-md bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            {formError !== null ? (
              <p className="mt-3 text-sm text-destructive">{formError}</p>
            ) : null}
            <Button
              className="mt-4 w-full"
              disabled={isBusy}
              type="submit"
            >
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              {isBusy ? "Working..." : "Schedule publication"}
            </Button>
          </section>
        </aside>
      </form>
    </>
  );
}
