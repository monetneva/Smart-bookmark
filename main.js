// --- Global Variables ---
let contentEN = {};
let contentES = {};
let language = "EN";
let bookTitle = localStorage.getItem('detectedBookTitle') || "";
let bookChapter = localStorage.getItem('detectedBookChapter') || "";
let speechMsg = null;
let voices = [];
let voicesLoaded = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// --- Browser Compatibility Check ---
function checkSpeechSupport() {
    console.log('Checking speech synthesis support...');
    if (!('speechSynthesis' in window)) {
        console.error('Speech synthesis not supported in window object');
        showVoiceError('Speech synthesis is not supported in your browser. Please try Chrome, Safari, or Edge.');
        return false;
    }
    console.log('Speech synthesis is supported');
    return true;
}

// --- DOMContentLoaded Handler ---
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM Content Loaded, initializing app...');
    const savedLang = localStorage.getItem('lang');
    if (savedLang) language = savedLang;

    // Update language button text initially
    const toggleBtn = document.getElementById('toggleLangBtn');
    if (toggleBtn) {
        toggleBtn.innerText = language === "EN" ? "🇺🇸 English" : "🇪🇸 Spanish";
    }

    // Update global variables from localStorage
    bookTitle = localStorage.getItem('detectedBookTitle') || "";
    bookChapter = localStorage.getItem('detectedBookChapter') || "";

    const storedEN = localStorage.getItem('contentEN');
    const storedES = localStorage.getItem('contentES');

    if (storedEN && storedES && bookTitle && bookChapter) {
        try {
            contentEN = JSON.parse(storedEN);
            contentES = JSON.parse(storedES);
            document.getElementById('mainButtons').style.display = 'grid';
        } catch (e) {
            console.error('Error parsing stored content:', e);
        }
    }

    updateHeaderBookInfo();
    
    // Initialize voices without showing error initially
    if (checkSpeechSupport()) {
        try {
            await initializeVoicesWithRetry();
        } catch (e) {
            console.error('Voice initialization error:', e);
        }
    }

    const savedAvatar = localStorage.getItem('savedAvatar');
    if (savedAvatar) {
        const avatarDiv = document.getElementById('avatarPreview');
        if (avatarDiv) {
            avatarDiv.innerHTML = `<img src="${savedAvatar}" width="50" height="50" style="border-radius:8px; border:2px solid #E50914;" />`;
        }
    }

    setupButtonListeners();
});

// --- Fetch AI Content ---
async function fetchContent() {
    const response = await fetch('/generate_content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: bookTitle, chapter: bookChapter })
    });

    const data = await response.json();
    if (data.content_en && data.content_es) {
        contentEN = parseContent(data.content_en, "EN");
        contentES = parseContent(data.content_es, "ES");
        localStorage.setItem('contentEN', JSON.stringify(contentEN));
        localStorage.setItem('contentES', JSON.stringify(contentES));
    }
}

// --- Update Header Info ---
function updateHeaderBookInfo() {
    const titleText = document.getElementById('bookTitleText');
    if (titleText) {
        if (bookTitle && bookChapter) {
            titleText.innerText = `${bookTitle} — ${bookChapter}`;
        } else {
            titleText.innerText = "Book Info Not Available";
        }
    }
}


// --- Parse Content ---
function parseContent(rawText, lang = "EN") {
    let sections = { about: "", fun_facts: [], vocab: [], discussion: [], similar_titles: [] };
    rawText = rawText.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n").trim();

    const headings = lang === "EN" ? {
        about: "ABOUT", fun_facts: "FUN FACTS", vocab: "VOCAB", discussion: "DISCUSSION", similar_titles: "SIMILAR TITLES"
    } : {
        about: "ACERCA DE", fun_facts: "DATOS DIVERTIDOS", vocab: "VOCABULARIO", discussion: "DISCUSIÓN", similar_titles: "TÍTULOS SIMILARES"
    };

    const aboutMatch = rawText.split(new RegExp(`${headings.about}:`, 'i'))[1]?.split(new RegExp(`${headings.fun_facts}:`, 'i'))[0];
    const funFactsMatch = rawText.split(new RegExp(`${headings.fun_facts}:`, 'i'))[1]?.split(new RegExp(`${headings.vocab}:`, 'i'))[0];
    const vocabMatch = rawText.split(new RegExp(`${headings.vocab}:`, 'i'))[1]?.split(new RegExp(`${headings.discussion}:`, 'i'))[0];
    const discussionMatch = rawText.split(new RegExp(`${headings.discussion}:`, 'i'))[1]?.split(new RegExp(`${headings.similar_titles}:`, 'i'))[0];
    const similarTitlesMatch = rawText.split(new RegExp(`${headings.similar_titles}:`, 'i'))[1];

    if (aboutMatch) sections.about = aboutMatch.trim();
    if (funFactsMatch) sections.fun_facts = funFactsMatch.trim().split(/\n[-•]?\s*/).filter(x => x.trim());
    if (vocabMatch) sections.vocab = vocabMatch.trim().split(/\n[-•]?\s*/).filter(x => x.trim());
    if (discussionMatch) sections.discussion = discussionMatch.trim().split(/\n\d+\.\s*/).filter(x => x.trim());
    if (similarTitlesMatch) sections.similar_titles = similarTitlesMatch.trim().split(/\n\d+\.\s*/).filter(x => x.trim());

    return sections;
}

// --- Language Toggle ---
function toggleLanguageAndReload() {
    // Toggle and save BEFORE reload
    language = (language === "EN") ? "ES" : "EN";
    localStorage.setItem('lang', language);
    
    // Force reload the page to ensure clean state
    window.location.reload();
}

// --- Update Content Display ---
function updateDisplayedContent() {
    console.log('Updating content to language:', language);
    console.log('Available content:', { EN: contentEN, ES: contentES });
    
    const currentContent = language === "EN" ? contentEN : contentES;
    
    // Ensure we have content to display
    if (!currentContent) {
        console.error('No content available for language:', language);
        return;
    }

    // Update About section if it exists
    const aboutSection = document.getElementById('aboutSection');
    if (aboutSection) {
        aboutSection.innerHTML = `<h2>${language === "EN" ? "About" : "Acerca de"}</h2><p>${currentContent.about || ''}</p>`;
    }

    // Update Fun Facts if it exists
    const funFactsSection = document.getElementById('funFactsSection');
    if (funFactsSection && currentContent.fun_facts) {
        funFactsSection.innerHTML = `
            <h2>${language === "EN" ? "Fun Facts" : "Datos Divertidos"}</h2>
            <ul>${currentContent.fun_facts.map(fact => `<li>${fact}</li>`).join('')}</ul>
        `;
    }

    // Update Vocab if it exists
    const vocabSection = document.getElementById('vocabSection');
    if (vocabSection && currentContent.vocab) {
        vocabSection.innerHTML = `
            <h2>${language === "EN" ? "Vocabulary" : "Vocabulario"}</h2>
            <ul>${currentContent.vocab.map(word => `<li>${word}</li>`).join('')}</ul>
        `;
    }

    // Update Discussion if it exists
    const discussionSection = document.getElementById('discussionSection');
    if (discussionSection && currentContent.discussion) {
        discussionSection.innerHTML = `
            <h2>${language === "EN" ? "Discussion" : "Discusión"}</h2>
            <ol>${currentContent.discussion.map(point => `<li>${point}</li>`).join('')}</ol>
        `;
    }

    // Update Similar Titles if it exists
    const similarSection = document.getElementById('similarTitlesSection');
    if (similarSection && currentContent.similar_titles) {
        similarSection.innerHTML = `
            <h2>${language === "EN" ? "Similar Titles" : "Títulos Similares"}</h2>
            <ol>${currentContent.similar_titles.map(title => `<li>${title}</li>`).join('')}</ol>
        `;
    }

    // Update button labels
    const buttonLabels = {
        'aboutBtn': language === "EN" ? "About" : "Acerca de",
        'funFactsBtn': language === "EN" ? "Fun Facts" : "Datos",
        'vocabBtn': language === "EN" ? "Vocabulary" : "Vocabulario",
        'discussionBtn': language === "EN" ? "Discussion" : "Discusión",
        'similarTitlesBtn': language === "EN" ? "Similar Books" : "Libros Similares"
    };

    Object.entries(buttonLabels).forEach(([id, label]) => {
        const button = document.getElementById(id);
        if (button) {
            button.innerText = label;
        }
    });
}

// --- Log Student Actions ---
function logAction(action) {
    console.log("Attempting to log action:", action);
    fetch('/log_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: action.type,
            timestamp: action.time,
            student_id: 'demo-student'
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Log action successful:", data);
    })
    .catch(error => {
        console.error("Logging action failed:", error);
    });
}

// --- Button Event Listeners ---
function setupButtonListeners() {
    const buttons = {
        langBtn: { id: 'toggleLangBtn', type: 'toggled-language', action: toggleLanguageAndReload },
        aboutBtn: { 
            id: 'aboutBtn', 
            type: 'clicked-about',
            action: () => {
                hideAllSections();
                const section = document.getElementById('aboutSection');
                if (section) {
                    section.style.display = 'block';
                    updateDisplayedContent();
                }
            }
        },
        funFactsBtn: { 
            id: 'funFactsBtn', 
            type: 'clicked-fun-facts',
            action: () => {
                hideAllSections();
                const section = document.getElementById('funFactsSection');
                if (section) {
                    section.style.display = 'block';
                    updateDisplayedContent();
                }
            }
        },
        vocabBtn: { 
            id: 'vocabBtn', 
            type: 'clicked-vocab',
            action: () => {
                hideAllSections();
                const section = document.getElementById('vocabSection');
                if (section) {
                    section.style.display = 'block';
                    updateDisplayedContent();
                }
            }
        },
        discussionBtn: { 
            id: 'discussionBtn', 
            type: 'clicked-discussion',
            action: () => {
                hideAllSections();
                const section = document.getElementById('discussionSection');
                if (section) {
                    section.style.display = 'block';
                    updateDisplayedContent();
                }
            }
        },
        similarTitlesBtn: { 
            id: 'similarTitlesBtn', 
            type: 'clicked-similar-titles',
            action: () => {
                hideAllSections();
                const section = document.getElementById('similarTitlesSection');
                if (section) {
                    section.style.display = 'block';
                    updateDisplayedContent();
                }
            }
        },
    };

    for (const key in buttons) {
        const btn = document.getElementById(buttons[key].id);
        if (btn) {
            btn.addEventListener('click', () => {
                logAction({ type: buttons[key].type, time: new Date().toISOString() });
                if (buttons[key].action) {
                    buttons[key].action();
                }
            });
        }
    }
}

// Helper function to hide all content sections
function hideAllSections() {
    const sections = ['aboutSection', 'funFactsSection', 'vocabSection', 'discussionSection', 'similarTitlesSection'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = 'none';
        }
    });
}

// --- Voice Functions ---
function showVoiceError(message) {
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;

    // Only show error for actual errors, not loading states
    if (!message.includes('Loading voices...')) {
        voiceSelect.innerHTML = '<option value="">No voices available</option>';
        voiceSelect.disabled = true;
        
        // Remove any existing error message
        const existingError = document.getElementById('voiceErrorMessage');
        if (existingError) {
            existingError.remove();
        }
        
        // Show error message to user
        const errorMsg = document.createElement('div');
        errorMsg.id = 'voiceErrorMessage';
        errorMsg.style.color = '#E50914';
        errorMsg.style.marginTop = '10px';
        errorMsg.style.padding = '10px';
        errorMsg.style.border = '1px solid #E50914';
        errorMsg.style.borderRadius = '4px';
        errorMsg.style.backgroundColor = '#FFF0F0';
        errorMsg.innerHTML = `⚠️ ${message}<br><small>Try these steps:<br>1. Check if your browser allows text-to-speech<br>2. Make sure you're using a supported browser (Chrome, Safari, Edge)<br>3. Check if your system has speech voices installed</small>`;
        voiceSelect.parentNode.appendChild(errorMsg);
    }
}

// --- Voice Initialization with Retry ---
async function initializeVoicesWithRetry() {
    console.log(`Attempting voice initialization (attempt ${initializationAttempts + 1}/${MAX_INIT_ATTEMPTS})`);
    
    try {
        await initializeVoices();
        console.log('Voice initialization successful');
        // Reset attempts on success
        initializationAttempts = 0;
    } catch (e) {
        console.error('Voice initialization failed:', e);
        initializationAttempts++;
        
        if (initializationAttempts < MAX_INIT_ATTEMPTS) {
            console.log(`Retrying in 1 second... (${initializationAttempts}/${MAX_INIT_ATTEMPTS})`);
            // Show temporary message
            showVoiceError(`Loading voices... Attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS}`);
            // Wait 1 second before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            await initializeVoicesWithRetry();
        } else {
            console.error('Max initialization attempts reached');
            showVoiceError('Unable to load voices after multiple attempts. Please try refreshing the page.');
        }
    }
}

// Force immediate voice check
function forceVoiceCheck() {
    if (typeof speechSynthesis !== 'undefined') {
        speechSynthesis.cancel(); // Clear any pending speech
        const availableVoices = speechSynthesis.getVoices();
        if (availableVoices && availableVoices.length > 0) {
            voices = availableVoices;
            voicesLoaded = true;
            populateVoices();
            return true;
        }
    }
    return false;
}

async function initializeVoices() {
    console.log('Starting voice initialization...');
    
    // Try immediate force check first
    if (forceVoiceCheck()) {
        console.log('Voices loaded immediately through force check');
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            if (forceVoiceCheck()) {
                console.log('Voices loaded through timeout force check');
                clearTimeout(timeoutId);
                resolve();
                return;
            }
            console.error('Voice initialization timed out');
            reject(new Error('Voice initialization timed out'));
        }, 2000); // Reduced timeout to 2 seconds for faster feedback

        function onVoicesChanged() {
            voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
                clearTimeout(timeoutId);
                voicesLoaded = true;
                // Log all voices for debugging
                console.log('Available voices:', voices.map(v => ({
                    name: v.name,
                    lang: v.lang,
                    default: v.default,
                    localService: v.localService,
                    voiceURI: v.voiceURI
                })));
                populateVoices();
                resolve();
            } else {
                // Try force check before rejecting
                if (forceVoiceCheck()) {
                    clearTimeout(timeoutId);
                    resolve();
                } else {
                    reject(new Error('No voices available'));
                }
            }
        }

        // Set up event listener for async load
        speechSynthesis.onvoiceschanged = onVoicesChanged;
        
        // Try immediate check
        onVoicesChanged();
    });
}

function getSpookyVoice() {
    // Try to find Rocko first
    const langPrefix = language === "EN" ? 'en' : 'es';
    
    // Log all available voices for debugging
    console.log('All available voices:', voices.map(v => `${v.name} (${v.lang})`));
    console.log('Current language prefix:', langPrefix);
    
    // First try to find Rocko with matching language
    const rockoVoice = voices.find(v => 
        v.name.toLowerCase().includes('rocko') && 
        v.lang.toLowerCase().startsWith(langPrefix)
    );
    
    if (rockoVoice) {
        console.log('Found Rocko with matching language:', rockoVoice.name);
        return rockoVoice;
    }
    
    // Then try to find any Rocko
    const anyRocko = voices.find(v => v.name.toLowerCase().includes('rocko'));
    if (anyRocko) {
        console.log('Found Rocko (any language):', anyRocko.name);
        return anyRocko;
    }
    
    console.log('No Rocko found, checking exact voice names for debugging...');
    voices.forEach(v => console.log(`Voice name: "${v.name}", Language: "${v.lang}"`));
    
    // If no Rocko found, use backup spooky voices
    const spookyVoiceNames = [
        'Daniel',
        'Fred',
        'Albert',
        'Ralph',
        'Alex'
    ];
    
    // Try each backup voice with matching language
    for (const name of spookyVoiceNames) {
        const voice = voices.find(v => 
            v.name === name && 
            v.lang.toLowerCase().startsWith(langPrefix)
        );
        if (voice) {
            console.log('Using backup spooky voice:', voice.name);
            return voice;
        }
    }
    
    // If still no match, use any male voice
    const maleVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith(langPrefix) && 
        !v.name.toLowerCase().includes('female') &&
        !v.name.toLowerCase().includes('mujer')
    );
    
    if (maleVoice) {
        console.log('Using fallback male voice:', maleVoice.name);
        return maleVoice;
    }
    
    // Final fallback - just use the first voice
    console.log('Using first available voice:', voices[0].name);
    return voices[0];
}

function autoSwitchVoice() {
    if (!voicesLoaded || !voices.length) return;
    
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;

    // Clear any stored selection
    localStorage.removeItem(`selectedVoice_${language}`);
    speechSynthesis.cancel();
    
    const bookTitleLower = bookTitle.toLowerCase();
    
    // For spooky books
    if (bookTitleLower.includes('wax') || bookTitleLower.includes('wicked') || bookTitleLower.includes('no bones')) {
        const spookyVoice = getSpookyVoice();
        if (spookyVoice) {
            const voiceIndex = voices.indexOf(spookyVoice);
            voiceSelect.value = voiceIndex;
            localStorage.setItem(`selectedVoice_${language}`, voiceIndex);
        }
        return;
    }
    
    // Handle other books...
    if (bookTitleLower.includes('wimpy')) {
        const youngVoice = voices.find(v => v.name === 'Alex');
        if (youngVoice) {
            voiceSelect.value = voices.indexOf(youngVoice);
        }
    } else if (bookTitleLower.includes('lorax')) {
        const energeticVoice = voices.find(v => v.name === 'Fred');
        if (energeticVoice) {
            voiceSelect.value = voices.indexOf(energeticVoice);
        }
    }
}

function populateVoices() {
    if (!voicesLoaded) return;
    
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;

    voiceSelect.innerHTML = '';
    
    // Add all voices to the dropdown
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voices.indexOf(voice);
        
        // Add icons for special voices
        let icon = '';
        if (voice.name.toLowerCase().includes('rocko')) {
            icon = ' 💀';
        } else if (['Daniel', 'Fred', 'Albert', 'Ralph', 'Alex'].includes(voice.name)) {
            icon = ' 👻';
        }
        
        option.innerText = `${voice.name}${icon} (${voice.lang})`;
        voiceSelect.appendChild(option);
    });

    // Set the voice
    autoSwitchVoice();
    
    voiceSelect.disabled = false;
    
    const errorMsg = document.getElementById('voiceErrorMessage');
    if (errorMsg) errorMsg.remove();
}

function readAloud(text) {
    if (!voicesLoaded || !voices.length) return;
    
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }

    const bookTitleLower = bookTitle.toLowerCase();
    
    // For spooky books
    if (bookTitleLower.includes('wax') || bookTitleLower.includes('wicked') || bookTitleLower.includes('no bones')) {
        const spookyVoice = getSpookyVoice();
        if (spookyVoice) {
            speechMsg = new SpeechSynthesisUtterance(text);
            speechMsg.voice = spookyVoice;
            speechMsg.rate = 1.0;
            speechMsg.pitch = 1.0;
            speechMsg.onstart = () => showSpeakingStatus(true);
            speechMsg.onend = () => showSpeakingStatus(false);
            speechSynthesis.speak(speechMsg);
            return;
        }
    }

    // For all other cases
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;

    speechMsg = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices[voiceSelect.value];
    if (selectedVoice) {
        speechMsg.voice = selectedVoice;
        speechMsg.rate = 1.0;
        speechMsg.pitch = 1.0;
    }

    speechMsg.onstart = () => showSpeakingStatus(true);
    speechMsg.onend = () => showSpeakingStatus(false);
    speechSynthesis.speak(speechMsg);
}

function showSpeakingStatus(show) {
    let status = document.getElementById('speakingStatus');
    if (!status) {
        status = document.createElement('div');
        status.id = 'speakingStatus';
        status.style.color = '#E50914';
        status.style.fontWeight = 'bold';
        status.style.marginTop = '10px';
        status.innerText = "📢 Speaking...";
        document.body.appendChild(status);
    }
    status.style.display = show ? 'block' : 'none';
}

function readContent(section) {
    const text = (language === "EN" ? contentEN : contentES)[section];
    if (Array.isArray(text)) {
        readAloud(text.join(". "));
    } else {
        readAloud(text);
    }
}

function pauseSpeech() {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
    }
}

function resumeSpeech() {
    if (speechSynthesis.paused) {
        speechSynthesis.resume();
    }
}
