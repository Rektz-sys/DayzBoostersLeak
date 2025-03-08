// Theme handling
function updateCodeMirrorTheme() {
    const currentTheme = localStorage.getItem('templateCustomizer-front-pages--Style') || 'dark';
    const cmTheme = currentTheme === 'dark' ? 'darcula' : 'default';
    
    inputEditor.setOption('theme', cmTheme);
    outputEditor.setOption('theme', cmTheme);
    if (filePreviewEditor) {
        filePreviewEditor.setOption('theme', cmTheme);
    }
}

// Initialize CodeMirror editors with theme check
let inputEditor = CodeMirror(document.getElementById("inputCodeEditor"), {
    mode: "javascript",
    theme: localStorage.getItem('templateCustomizer-front-pages--Style') === 'light' ? 'default' : 'darcula',
    lineNumbers: true,
    lineWrapping: true,
    placeholder: "Paste your SpawnObject code here...",
    viewportMargin: Infinity
});

let outputEditor = CodeMirror(document.getElementById("outputJsonEditor"), {
    mode: "application/json",
    theme: localStorage.getItem('templateCustomizer-front-pages--Style') === 'light' ? 'default' : 'darcula',
    lineNumbers: true,
    lineWrapping: true,
    readOnly: true,
    viewportMargin: Infinity
});

let filePreviewEditor = null;

// Watch for theme changes
const observer = new MutationObserver(() => {
    updateCodeMirrorTheme();
});

observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
});

// Watch for localStorage changes
window.addEventListener('storage', function(e) {
    if (e.key === 'templateCustomizer-front-pages--Style') {
        updateCodeMirrorTheme();
    }
});

// Handle form submission
document.getElementById('converterForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const inputCode = inputEditor.getValue().trim();
    if (!inputCode) {
        showAlert('Please enter some SpawnObject code first', 'warning');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('functionCall', inputCode);

        const response = await fetch('/assets/config/p3d_handler.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.error) {
            showAlert(data.error, 'danger');
        } else {
            outputEditor.setValue(JSON.stringify(data, null, 2));
            showAlert('Conversion successful!', 'success');
        }
    } catch (error) {
        showAlert('An error occurred during conversion', 'danger');
        console.error('Conversion error:', error);
    }
});

// Handle export button
document.getElementById('exportBtn').addEventListener('click', function() {
    const jsonData = outputEditor.getValue().trim();
    
    if (!jsonData) {
        showAlert('No data to export. Please convert some code first.', 'warning');
        return;
    }

    try {
        JSON.parse(jsonData); // Validate JSON
        downloadJson(jsonData, 'p3d_conversion.json');
        showAlert('File exported successfully!', 'success');
    } catch (error) {
        showAlert('Invalid JSON data cannot be exported', 'danger');
    }
});

// Initialize file upload functionality
document.addEventListener('DOMContentLoaded', function() {
    // Call theme update on load
    updateCodeMirrorTheme();
    
    // Add custom styles for alerts and CodeMirror
    const style = document.createElement('style');
    style.textContent = `
        .alert-container {
            position: fixed !important;
            top: 1rem !important;
            right: 1rem !important;
            z-index: 9999 !important;
            max-width: 400px !important;
        }
        .alert {
            margin-bottom: 0.5rem;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .CodeMirror {
            border: 1px solid var(--bs-border-color);
            height: auto !important;
            min-height: 200px !important;
        }
        .CodeMirror-scroll {
            min-height: 200px !important;
        }
    `;
    document.head.appendChild(style);

    // Initialize file preview editor
    filePreviewEditor = CodeMirror(document.getElementById("filePreviewEditor"), {
        mode: "javascript",
        theme: localStorage.getItem('templateCustomizer-front-pages--Style') === 'light' ? 'default' : 'darcula',
        lineNumbers: true,
        lineWrapping: true,
        readOnly: false,
        viewportMargin: Infinity
    });

    // Toggle upload section
    const toggleUploadBtn = document.getElementById('toggleUploadBtn');
    const uploadSection = document.getElementById('uploadSection');
    
    if (toggleUploadBtn && uploadSection) {
        toggleUploadBtn.addEventListener('click', function() {
            const isCollapsed = uploadSection.classList.contains('collapse');
            if (isCollapsed) {
                uploadSection.classList.remove('collapse');
                toggleUploadBtn.innerHTML = '<i class="ti ti-x me-1"></i> Hide Upload';
            } else {
                uploadSection.classList.add('collapse');
                toggleUploadBtn.innerHTML = '<i class="ti ti-upload me-1"></i> Show Upload';
            }
        });
    }

    // File Input Handling
    const fileInput = document.getElementById('initFileInput');
    const browseFileBtn = document.getElementById('browseFileBtn');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const filePreviewSection = document.getElementById('filePreviewSection');
    const fileInfo = document.getElementById('fileInfo');
    const useSelectedCodeBtn = document.getElementById('useSelectedCodeBtn');

    if (browseFileBtn && fileInput) {
        browseFileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);

        // Handle drag and drop
        const dropZone = document.querySelector('.upload-zone');
        
        if (dropZone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, highlight, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, unhighlight, false);
            });

            dropZone.addEventListener('drop', handleDrop, false);
        }
    }

    // Handle file removal
    if (removeFileBtn && filePreviewSection) {
        removeFileBtn.addEventListener('click', () => {
            fileInput.value = '';
            filePreviewSection.classList.add('d-none');
            filePreviewEditor.setValue('');
        });
    }

    // Handle using selected code
    if (useSelectedCodeBtn && uploadSection) {
        useSelectedCodeBtn.addEventListener('click', () => {
            const selectedCode = filePreviewEditor.getSelection();
            if (selectedCode) {
                inputEditor.setValue(selectedCode);
                showAlert('Selected code copied to input', 'success');
                uploadSection.classList.add('collapse');
                toggleUploadBtn.innerHTML = '<i class="ti ti-upload me-1"></i> Show Upload';
            } else {
                showAlert('Please select the code you want to use', 'warning');
            }
        });
    }

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// Utility functions
function downloadJson(jsonData, filename) {
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function getAlertIcon(type) {
    const icons = {
        success: '<i class="ti ti-circle-check me-2"></i>',
        danger: '<i class="ti ti-alert-circle me-2"></i>',
        warning: '<i class="ti ti-alert-triangle me-2"></i>',
        info: '<i class="ti ti-info-circle me-2"></i>'
    };
    return icons[type] || icons.info;
}

function showAlert(message, type = 'info') {
    if (type === 'error') type = 'danger';
    
    const alertContainer = document.querySelector('.alert-container') || (() => {
        const container = document.createElement('div');
        container.className = 'alert-container';
        document.body.appendChild(container);
        return container;
    })();
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show d-flex align-items-center`;
    alertDiv.innerHTML = `
        ${getAlertIcon(type)}
        <div class="flex-grow-1">
            ${message}
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}

// File handling functions
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    document.querySelector('.upload-zone').classList.add('border-primary');
}

function unhighlight(e) {
    document.querySelector('.upload-zone').classList.remove('border-primary');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFileSelect({ target: { files: files } });
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const validExtensions = ['.c', '.txt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(fileExtension)) {
        showAlert('Invalid file type. Please upload a .c or .txt file', 'danger');
        resetFileUpload();
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        let content = e.target.result;
        
        const hasSpawnObjectDefinition = /static\s+Object\s+SpawnObject\s*\(/.test(content);
        const hasCreatedObjectsComment = /\/\/\s*Created\s*Objects/.test(content);
        const hasSpawnObjectCalls = /SpawnObject\s*\(\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*[0-9.]+\s*\)/.test(content);

        if (!hasCreatedObjectsComment && !hasSpawnObjectCalls) {
            showAlert('No spawn objects found in the file.', 'warning');
            resetFileUpload();
            return;
        }

        if (hasSpawnObjectDefinition && !hasSpawnObjectCalls) {
            showAlert('This appears to be an unmodified init.c file.', 'warning');
            resetFileUpload();
            return;
        }

        let extractedContent = '';
        if (hasCreatedObjectsComment) {
            const spawnObjectRegex = /\/\/\s*Created\s*Objects([\s\S]*?)(?=\/\/|$)/;
            const match = content.match(spawnObjectRegex);
            
            if (match && match[1]) {
                extractedContent = match[1].trim();
                if (!/SpawnObject\s*\(/.test(extractedContent)) {
                    showAlert('No spawn objects found in the Created Objects section.', 'warning');
                    resetFileUpload();
                    return;
                }
                showAlert('SpawnObject section found and extracted', 'success');
            } else {
                showAlert('Created Objects section found but no spawn objects detected', 'warning');
                resetFileUpload();
                return;
            }
        } else if (hasSpawnObjectCalls) {
            const spawnObjectLines = content.match(/SpawnObject\s*\([^\)]+\);/g);
            if (spawnObjectLines) {
                extractedContent = spawnObjectLines.join('\n');
                showAlert('SpawnObject commands extracted', 'success');
            }
        }

        if (extractedContent) {
            document.getElementById('fileInfo').textContent = `${file.name} (${formatFileSize(file.size)})`;
            document.getElementById('filePreviewSection').classList.remove('d-none');
            filePreviewEditor.setValue(extractedContent);
        } else {
            showAlert('No valid SpawnObject commands found in the file', 'warning');
            resetFileUpload();
        }
    };

    reader.onerror = function() {
        showAlert('Error reading file', 'danger');
        resetFileUpload();
    };

    reader.readAsText(file);
}

function resetFileUpload() {
    const fileInput = document.getElementById('initFileInput');
    const filePreviewSection = document.getElementById('filePreviewSection');
    if (fileInput) fileInput.value = '';
    if (filePreviewSection) filePreviewSection.classList.add('d-none');
    if (filePreviewEditor) filePreviewEditor.setValue('');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Add keyboard shortcuts
// Add keyboard shortcuts and watch for theme changes
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.querySelector('button[type="submit"]').click();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('exportBtn').click();
    }

    if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        const helpModal = new bootstrap.Modal(document.getElementById('helpModal'));
        helpModal.show();
    }
});

// Watch for theme changes in the template customizer
document.addEventListener('templateCustomizer:initialized', function() {
    updateCodeMirrorTheme();
});

// Additional theme change monitoring
const themeButton = document.querySelector('[data-theme-control="theme"]');
if (themeButton) {
    themeButton.addEventListener('click', function() {
        setTimeout(updateCodeMirrorTheme, 100);
    });
}

// Add theme change listener to all theme switcher buttons
document.querySelectorAll('[data-theme]').forEach(button => {
    button.addEventListener('click', function() {
        setTimeout(updateCodeMirrorTheme, 100);
    });
});