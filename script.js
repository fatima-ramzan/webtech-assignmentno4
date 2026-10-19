
const editor = document.getElementById("markdownEditor");
const slideContent = document.getElementById("slideContent");
const slideCounter = document.getElementById("slideCounter");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const previewPanel = document.getElementById("previewPanel");
const saveStatus = document.getElementById("saveStatus");

const STORAGE_KEY = "markdownSlidesPresentation";

let slides = [];
let currentSlide = 0;
let saveTimer;

function parseSlides(markdown) {
    return markdown
        .split(/^---\s*$/m)
        .map(slide => slide.trim())
        .filter(slide => slide.length > 0);
}

function updatePreview() {
    slides = parseSlides(editor.value);

    if (slides.length === 0) {
        slides = ["# Empty Slide\n\nStart writing Markdown."];
    }

    currentSlide = Math.min(currentSlide, slides.length - 1);
    renderSlide();
    scheduleSave();
}

function renderSlide() {
    const markdown = slides[currentSlide] || "";

    if (window.marked) {
        slideContent.innerHTML = marked.parse(markdown);
    } else {
        slideContent.textContent = markdown;
    }

    slideCounter.textContent =
        `${currentSlide + 1} / ${slides.length}`;

    prevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide === slides.length - 1;
}

function goToSlide(index) {
    if (index < 0 || index >= slides.length) return;

    currentSlide = index;
    renderSlide();
}

function saveSlides() {
    try {
        localStorage.setItem(STORAGE_KEY, editor.value);
        saveStatus.textContent = "Saved in browser";
    } catch (error) {
        saveStatus.textContent = "Save failed";
        console.error(error);
    }
}

function scheduleSave() {
    clearTimeout(saveTimer);
    saveStatus.textContent = "Unsaved changes...";

    saveTimer = setTimeout(saveSlides, 400);
}

async function loadSlides() {
    const savedMarkdown = localStorage.getItem(STORAGE_KEY);

    if (savedMarkdown !== null) {
        editor.value = savedMarkdown;
    } else {
        try {
            const response = await fetch("slides.md");

            if (!response.ok) {
                throw new Error("Could not load slides.md");
            }

            editor.value = await response.text();
        } catch (error) {
            editor.value =
                "# My Presentation\n\nWrite your first slide here.";
            console.error(error);
        }
    }

    updatePreview();
}

async function toggleFullscreen() {
    try {
        if (!document.fullscreenElement) {
            await previewPanel.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    } catch (error) {
        console.error("Fullscreen unavailable:", error);
    }
}

function updateFullscreenButton() {
    fullscreenBtn.textContent = document.fullscreenElement
        ? "⛶ Exit Full Screen"
        : "⛶ Full Screen";
}

function togglePresentation() {
    document.body.classList.toggle("presenting");

    const isPresenting =
        document.body.classList.contains("presenting");

    document.getElementById("presentBtn").textContent =
        isPresenting ? "Exit Presentation" : "Present";

    document.getElementById("previewLabel").textContent =
        isPresenting ? "Presentation Mode" : "Live Preview";
}

function exportMarkdown() {
    const blob = new Blob([editor.value], {
        type: "text/markdown;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "slides.md";
    link.click();

    URL.revokeObjectURL(url);
}

editor.addEventListener("input", updatePreview);

prevBtn.addEventListener("click", () => {
    goToSlide(currentSlide - 1);
});

nextBtn.addEventListener("click", () => {
    goToSlide(currentSlide + 1);
});

document.getElementById("saveBtn").addEventListener("click", () => {
    clearTimeout(saveTimer);
    saveSlides();
});

document.getElementById("exportBtn").addEventListener(
    "click",
    exportMarkdown
);

fullscreenBtn.addEventListener("click", toggleFullscreen);

document.getElementById("presentBtn").addEventListener(
    "click",
    togglePresentation
);

document.getElementById("newBtn").addEventListener("click", () => {
    if (confirm("Create a new presentation?")) {
        editor.value = "# New Presentation\n\nWrite your slide here.";
        currentSlide = 0;
        updatePreview();
    }
});

document.addEventListener("fullscreenchange", updateFullscreenButton);

document.addEventListener("keydown", event => {
    if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s"
    ) {
        event.preventDefault();
        clearTimeout(saveTimer);
        saveSlides();
        return;
    }

    if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
    ) {
        return;
    }

    const typing = event.target.matches(
        "textarea, input, [contenteditable='true']"
    );

    if (typing) return;

    if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToSlide(currentSlide - 1);
    } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToSlide(currentSlide + 1);
    } else if (event.key === "F11") {
        event.preventDefault();
        toggleFullscreen();
    } else if (
        event.key === "Escape" &&
        document.body.classList.contains("presenting")
    ) {
        togglePresentation();
    }
});

window.addEventListener("pagehide", saveSlides);

loadSlides();
