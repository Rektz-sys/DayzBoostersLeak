// Main DZE Converter Object
const DZEConverter = {
	validateDZEObject: function(dzeObject) {
        const required = ['MapName', 'CameraPosition', 'EditorObjects'];
        const errors = [];

        for (const field of required) {
            if (!(field in dzeObject)) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        if (dzeObject.EditorObjects) {
            for (let i = 0; i < dzeObject.EditorObjects.length; i++) {
                const obj = dzeObject.EditorObjects[i];
                if (!obj.Type || !obj.Position || !obj.Orientation) {
                    errors.push(`Invalid object at index ${i}`);
                }
            }
        }

        return errors;
    },
	
	DEFAULT_CAMERA_POSITIONS: {
		'ChernarusPlus': [8060.8, 448.496, 9577.07],
		'Enoch': [6829.44, 272.346, 6408.94],
		'Sakhal': [5907.09, 14.4916, 5249.66]
	},
	MAP_SIZES: {
		'ChernarusPlus': { width: 15360, height: 15360 },
		'Enoch': { width: 12800, height: 12800 },
		'Sakhal': { width: 10250, height: 10250 } // Estimated until exact size known
	},
	
	generateRandomPosition: function(mapName) {
		const mapSize = this.MAP_SIZES[mapName];
		const defaultPos = this.DEFAULT_CAMERA_POSITIONS[mapName];
		if (!mapSize) return defaultPos;

		// Generate random X and Z within map bounds
		// Buffer of 500 units from edges
		const buffer = 500;
		const x = buffer + Math.random() * (mapSize.width - buffer * 2);
		const z = buffer + Math.random() * (mapSize.height - buffer * 2);
		
		// Use default Y value from default camera positions
		const y = defaultPos ? defaultPos[1] : 300; // Fallback to 300 if no default exists

		return [
			Math.round(x * 100) / 100,  // Round to 2 decimal places
			Math.round(y * 100) / 100,
			Math.round(z * 100) / 100
		];
	},
	
	getSelectedMap: function() {
        const mapSelect = document.getElementById('mapSelect');
        return mapSelect ? mapSelect.value : 'ChernarusPlus';
    },
	
	generateFilename: function() {
        const random = Math.random().toString(36).substring(2, 12);
        return `dze_dzb_${random}.dze`;
    },
	
	getDefaultCameraPosition: function(mapName) {
        return this.DEFAULT_CAMERA_POSITIONS[mapName] || [0, 0, 0];
    },
	
	calculateStatistics: function(jsonData) {
        const objects = jsonData.Objects || [];
        const positions = objects.map(obj => obj.pos);
        
        // Calculate statistics
        const stats = {
            totalObjects: objects.length,
            uniqueObjects: new Set(objects.map(obj => obj.name)).size,
            avgHeight: 0,
            buildArea: 0
        };

        // Calculate average height
        if (positions.length > 0) {
            const totalHeight = positions.reduce((sum, pos) => sum + pos[1], 0);
            stats.avgHeight = Math.round((totalHeight / positions.length) * 100) / 100;
        }

        // Calculate build area
        if (positions.length > 1) {
            const minX = Math.min(...positions.map(pos => pos[0]));
            const maxX = Math.max(...positions.map(pos => pos[0]));
            const minZ = Math.min(...positions.map(pos => pos[2]));
            const maxZ = Math.max(...positions.map(pos => pos[2]));
            stats.buildArea = Math.round((maxX - minX) * (maxZ - minZ));
        }

        return stats;
    },
	
	
	getCameraPosition: function(lastPosition, selectedMap) {
		const useDefault = document.getElementById('useDefaultCamera').checked;
		const useLastObject = document.getElementById('useLastObjectCamera').checked;
		const useRandom = document.getElementById('useRandomCamera').checked;

		if (useDefault) {
			return this.DEFAULT_CAMERA_POSITIONS[selectedMap] || [0, 0, 0];
		}
		if (useLastObject && lastPosition) {
			return lastPosition;
		}
		if (useRandom) {
			return this.generateRandomPosition(selectedMap);
		}
		// Fallback to default
		return this.DEFAULT_CAMERA_POSITIONS[selectedMap] || [0, 0, 0];
	},
	
    // Convert JSON data to DZE format
    convertJSONtoDZE: function(jsonData) {
		try {
			// If jsonData is a string, parse it, otherwise use directly
			const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
			
			// Direct object creation without unnecessary parsing
			const dzeStructure = {
				MapName: this.getSelectedMap(),
				CameraPosition: this.getCameraPosition(
					data.Objects[data.Objects.length - 1]?.pos, 
					this.getSelectedMap()
				),
				EditorObjects: data.Objects.map(obj => ({
					Type: obj.name,
					DisplayName: obj.name,
					Position: obj.pos,
					Orientation: obj.ypr,
					Scale: obj.scale,
					Flags: 2147483647
				})),
				EditorDeletedObjects: []
			};

			// Validate the structure before returning
			const validationErrors = this.validateDZEObject(dzeStructure);
			if (validationErrors.length > 0) {
				throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
			}

			return JSON.stringify(dzeStructure, null, 2);
		} catch (error) {
			throw new Error(`Conversion error: ${error.message}`);
		}
	},

    // Validate JSON input
    validateJSON: function(jsonString, isBulk = false) {
		try {
			if (isBulk) {
				// Split the input into separate JSON objects and filter empty strings
				const jsonStrings = jsonString.trim().split('\n\n')
					.filter(str => str.trim())
					.map(str => str.trim());
				
				if (jsonStrings.length === 0) {
					throw new Error("No valid JSON objects found");
				}

				// Validate each JSON object
				jsonStrings.forEach((json, index) => {
					try {
						const parsed = JSON.parse(json);
						if (!parsed.Objects || !Array.isArray(parsed.Objects)) {
							throw new Error(`Missing Objects array`);
						}
					} catch (e) {
						throw new Error(`Block ${index + 1}: ${e.message}`);
					}
				});
			} else {
				const parsed = JSON.parse(jsonString);
				if (!parsed.Objects || !Array.isArray(parsed.Objects)) {
					throw new Error("Invalid format: Missing Objects array");
				}
			}
			return true;
		} catch (error) {
			throw new Error(`Invalid JSON: ${error.message}`);
		}
	},
	
	processInChunks: async function(jsonData, chunkSize = 100) {
		try {
			const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
			const objects = data.Objects;
			const totalObjects = objects.length;
			let processedObjects = [];
			let lastPosition = null;

			// Show initial progress
			await Swal.fire({
				title: 'Processing Objects',
				html: `
					<div class="mb-3">Processing 0 of ${totalObjects} objects</div>
					<div class="progress">
						<div class="progress-bar progress-bar-striped progress-bar-animated" 
							role="progressbar" 
							style="width: 0%" 
							aria-valuenow="0" 
							aria-valuemin="0" 
							aria-valuemax="100">
							0%
						</div>
					</div>
				`,
				allowOutsideClick: false,
				allowEscapeKey: false,
				showConfirmButton: false,
				didOpen: () => {
					Swal.showLoading();
				}
			});

			// Process in chunks
			for (let i = 0; i < totalObjects; i += chunkSize) {
				const chunk = objects.slice(i, Math.min(i + chunkSize, totalObjects));
				
				// Process current chunk
				const processedChunk = chunk.map(obj => ({
					Type: obj.name,
					DisplayName: obj.name,
					Position: obj.pos,
					Orientation: obj.ypr,
					Scale: obj.scale,
					Flags: 2147483647
				}));

				processedObjects = processedObjects.concat(processedChunk);
				lastPosition = chunk[chunk.length - 1]?.pos || lastPosition;

				// Update progress
				const progress = Math.round(((i + chunk.length) / totalObjects) * 100);
				
				await Swal.update({
					html: `
						<div class="mb-3">Processed ${i + chunk.length} of ${totalObjects} objects</div>
						<div class="progress">
							<div class="progress-bar progress-bar-striped progress-bar-animated" 
								role="progressbar" 
								style="width: ${progress}%" 
								aria-valuenow="${progress}" 
								aria-valuemin="0" 
								aria-valuemax="100">
								${progress}%
							</div>
						</div>
					`
				});

				// Allow UI to update
				await new Promise(resolve => setTimeout(resolve, 0));
			}

			// Create final structure
			const selectedMap = this.getSelectedMap();
			const dzeStructure = {
				MapName: selectedMap,
				CameraPosition: this.getCameraPosition(lastPosition, selectedMap),
				EditorObjects: processedObjects,
				EditorDeletedObjects: []
			};

			// Validate before returning
			const validationErrors = this.validateDZEObject(dzeStructure);
			if (validationErrors.length > 0) {
				throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
			}

			return processedObjects;
		} catch (error) {
			console.error('Chunk processing error:', error);
			throw error;
		} finally {
			Swal.close();
		}
	},	

	convertChunk: function(chunkData) {
        return chunkData.Objects.map(obj => ({
            Type: obj.name,
            DisplayName: obj.name,
            Position: obj.pos,
            Orientation: obj.ypr,
            Scale: obj.scale,
            Flags: 2147483647
        }));
    },
	// In your processMultipleJSON function:
	processMultipleJSON: async function(input) {
		const jsonStrings = input.trim()
			.split('\n\n')
			.filter(str => str.trim())
			.map(str => str.trim());
		const results = [];
		const errors = [];
		const memoryLimit = 100 * 1024 * 1024; // 100MB limit
		let currentMemoryUsage = 0;

		// Show initial dialog
		await Swal.fire({
			title: 'Processing Bulk Conversion',
			html: `
				<div class="mb-3">
					<div class="fs-6 mb-2">Processing block: 0 of ${jsonStrings.length}</div>
					<div class="progress">
						<div class="progress-bar progress-bar-striped progress-bar-animated" 
							role="progressbar" 
							style="width: 0%" 
							aria-valuenow="0" 
							aria-valuemin="0" 
							aria-valuemax="100">
						</div>
					</div>
					<div class="mt-2 small text-muted">Initializing...</div>
				</div>
			`,
			allowOutsideClick: false,
			allowEscapeKey: false,
			showConfirmButton: false,
			didOpen: () => {
				Swal.showLoading();
			}
		});

		try {
			// Process each JSON string
			for (let i = 0; i < jsonStrings.length; i++) {
				const jsonStr = jsonStrings[i];
				try {
					// Estimate memory usage
					const estimatedSize = jsonStr.length * 2;
					
					if (currentMemoryUsage + estimatedSize > memoryLimit) {
						// Process accumulated results
						await this.processAccumulatedResults(results);
						results.length = 0;
						currentMemoryUsage = 0;
					}

					// Update progress UI
					const progress = Math.round(((i + 1) / jsonStrings.length) * 100);
					
					await Swal.update({
						html: `
							<div class="mb-3">
								<div class="fs-6 mb-2">Processing block: ${i + 1} of ${jsonStrings.length}</div>
								<div class="progress">
									<div class="progress-bar progress-bar-striped progress-bar-animated" 
										role="progressbar" 
										style="width: ${progress}%" 
										aria-valuenow="${progress}" 
										aria-valuemin="0" 
										aria-valuemax="100">
										${progress}%
									</div>
								</div>
								<div class="mt-2 small text-muted">Converting block ${i + 1}...</div>
							</div>
						`
					});

					// Convert the current block
					const result = await this.convertJSONtoDZE(jsonStr);
					results.push(result);
					currentMemoryUsage += estimatedSize;
					
					// Allow UI update
					await new Promise(resolve => setTimeout(resolve, 10));

				} catch (error) {
					errors.push(`Error in block ${i + 1}: ${error.message}`);
				}
			}

			if (errors.length > 0) {
				throw new Error('Bulk conversion errors:\n' + errors.join('\n'));
			}

			return results;
		} finally {
			// Ensure the dialog is closed
			Swal.close();
		}
	},
	
	processAccumulatedResults: async function(results) {
		// Process and save intermediate results if needed
		// This is a placeholder for potential future implementation
		return results;
	},
	
	generateStats: async function(results) {
		const stats = {
			totalObjects: 0,
			uniqueObjects: new Set(),
			heights: [],
			coordinates: {
				minX: Infinity,
				maxX: -Infinity,
				minZ: Infinity,
				maxZ: -Infinity
			}
		};

		// Process each result
		if (Array.isArray(results)) {
			// For bulk processing results
			results.forEach(result => {
				const dzeData = typeof result === 'string' ? JSON.parse(result) : result;
				this.processStatsForObjects(dzeData.EditorObjects || [], stats);
			});
		} else {
			// For single result
			const dzeData = typeof results === 'string' ? JSON.parse(results) : results;
			this.processStatsForObjects(dzeData.EditorObjects || [], stats);
		}

		return {
			totalObjects: stats.totalObjects,
			uniqueObjects: stats.uniqueObjects.size,
			avgHeight: stats.heights.length > 0 
				? Math.round((stats.heights.reduce((a, b) => a + b, 0) / stats.heights.length) * 100) / 100 
				: 0,
			buildArea: Math.round((stats.coordinates.maxX - stats.coordinates.minX) * 
								(stats.coordinates.maxZ - stats.coordinates.minZ))
		};
	},

	processStatsForObjects: function(objects, stats) {
		objects.forEach(obj => {
			stats.totalObjects++;
			stats.uniqueObjects.add(obj.Type);
			stats.heights.push(obj.Position[1]);
			
			stats.coordinates.minX = Math.min(stats.coordinates.minX, obj.Position[0]);
			stats.coordinates.maxX = Math.max(stats.coordinates.maxX, obj.Position[0]);
			stats.coordinates.minZ = Math.min(stats.coordinates.minZ, obj.Position[2]);
			stats.coordinates.maxZ = Math.max(stats.coordinates.maxZ, obj.Position[2]);
		});
	},

	validateObject: function(obj) {
		const required = ['Type', 'Position', 'Orientation', 'Scale'];
		const missing = required.filter(prop => !obj[prop]);
		
		if (missing.length > 0) {
			throw new Error(`Missing required properties: ${missing.join(', ')}`);
		}
		
		if (!Array.isArray(obj.Position) || obj.Position.length !== 3) {
			throw new Error('Invalid Position format');
		}
		
		if (!Array.isArray(obj.Orientation) || obj.Orientation.length !== 3) {
			throw new Error('Invalid Orientation format');
		}
		
		return true;
	}
	
};



// Initialize CodeMirror instances
let inputEditor, outputEditor;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize CodeMirror for input
    inputEditor = CodeMirror.fromTextArea(document.getElementById('jsonInput'), {
        mode: "application/json",
        theme: "dracula",
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        extraKeys: {
            "Ctrl-Space": "autocomplete"
        }
    });

    // Initialize CodeMirror for output
    outputEditor = CodeMirror.fromTextArea(document.getElementById('dzeOutput'), {
        mode: "application/json",
        theme: "dracula",
        lineNumbers: true,
        readOnly: true,
        lineWrapping: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
    });
	
	const savedInput = localStorage.getItem('jsonDzeLastInput');
	if (savedInput) {
		Swal.fire({
			title: 'Restore Previous Work?',
			text: 'We found unsaved work from your previous session.',
			icon: 'question',
			showCancelButton: true,
			confirmButtonText: 'Restore',
			cancelButtonText: 'Discard'
		}).then((result) => {
			if (result.isConfirmed) {
				inputEditor.setValue(savedInput);
				inputEditor.refresh();
				localStorage.removeItem('jsonDzeLastInput');
			} else {
				localStorage.removeItem('jsonDzeLastInput');
			}
		});
	}
	
	// File Upload Handling
	const fileInput = document.getElementById('fileInput');
	const uploadArea = fileInput.closest('.upload-area');
	
	// Handle drag and drop
	uploadArea.addEventListener('dragover', (e) => {
		e.preventDefault();
		uploadArea.classList.add('drag-over');
	});

	uploadArea.addEventListener('dragleave', (e) => {
		e.preventDefault();
		uploadArea.classList.remove('drag-over');
	});

	uploadArea.addEventListener('drop', (e) => {
		e.preventDefault();
		uploadArea.classList.remove('drag-over');
		
		const files = e.dataTransfer.files;
		if (files.length > 0) {
			handleFileUpload(files[0]);
		}
	});

	// Handle file input change
	fileInput.addEventListener('change', (e) => {
		if (e.target.files.length > 0) {
			handleFileUpload(e.target.files[0]);
		}
	});

	// File upload handler
	function handleFileUpload(file) {
		// Check file size (10MB limit)
		if (file.size > 50 * 1024 * 1024) {
			showNotification('File size exceeds 50MB limit', 'error');
			return;
		}

		// Check file type - only allow JSON
		if (!file.name.toLowerCase().endsWith('.json')) {
			showNotification('Only .json files are supported', 'error');
			return;
		}

		const reader = new FileReader();
		
		reader.onload = async (e) => {
			try {
				const content = e.target.result;
				
				// Validate JSON format
				JSON.parse(content); // This will throw if invalid JSON
				
				// Set content to input editor
				inputEditor.setValue(content);
				
				// If file is large (more than 1000 lines), show warning
				if (content.split('\n').length > 1000) {
					await Swal.fire({
						title: 'Large File Detected',
						text: 'This file contains a lot of data. Processing might take a while.',
						icon: 'warning',
						confirmButtonText: 'Continue'
					});
				}
				
				// Clear file input
				fileInput.value = '';
				
				showNotification('JSON file loaded successfully', 'success');
			} catch (error) {
				showNotification('Invalid JSON file: ' + error.message, 'error');
			}
		};
		
		reader.onerror = () => {
			showNotification('Error reading file', 'error');
		};
		
		reader.readAsText(file);
	}


     // Set sizes
    inputEditor.setSize("100%", 300);
    outputEditor.setSize("100%", 300);

    // Get DOM elements
    const form = document.getElementById('convertForm');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    const loadExampleBtn = document.getElementById('loadExampleBtn');
    const loadExampleBtn2 = document.getElementById('loadBulkExampleBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    // Example JSON template
    const exampleJson = {
        Objects: [
            {
                name: "Land_Village_HealthCare",
                pos: [7500, 300, 7500],
                ypr: [0, 0, 0],
                scale: 1
            }
        ]
    };
	
	const bulkExample = {
        example1: {
            Objects: [
                {
                    name: "Land_House_1W01",
                    pos: [7500, 300, 7500],
                    ypr: [0, 0, 0],
                    scale: 1
                }
            ]
        },
        example2: {
            Objects: [
                {
                    name: "Land_House_1W02",
                    pos: [7600, 300, 7600],
                    ypr: [90, 0, 0],
                    scale: 1
                }
            ]
        }
    };
	
	//document.getElementById('bulkConversion').checked = true;
    
    loadExampleBtn.addEventListener('click', function() {
        inputEditor.setValue(JSON.stringify(exampleJson, null, 2));
    });
	
	loadExampleBtn2.addEventListener('click', function() {
        inputEditor.setValue(
			JSON.stringify(bulkExample.example1, null, 2) + 
			'\n\n' + 
			JSON.stringify(bulkExample.example2, null, 2)
		);
		//document.getElementById('bulkConversion').checked = true;
    });
	
	const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function(tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Set initial example value
    inputEditor.setValue(JSON.stringify(exampleJson, null, 2));

    // Convert form submission
    form.addEventListener('submit', async function(e) {
		e.preventDefault();
		try {
			const jsonInput = inputEditor.getValue();
			const isBulkMode = document.getElementById('bulkConversion').checked;

			if (isBulkMode) {
    // Bulk mode processing
    const jsonStrings = jsonInput.trim().split('\n\n').filter(str => str.trim());
    
    if (jsonStrings.length <= 1) {
        showNotification('Only one code block detected in bulk mode. We have turned off Bulk Mode for you.. Try again!', 'error');
        document.getElementById('bulkConversion').checked = false;
        return;
    }

    try {
        // Process all JSON blocks using processMultipleJSON
        const results = await DZEConverter.processMultipleJSON(jsonInput);
        
        // Calculate statistics from the results
        const allStats = {
            totalObjects: 0,
            uniqueObjects: new Set(),
            heights: [],
            minX: Infinity,
            maxX: -Infinity,
            minZ: Infinity,
            maxZ: -Infinity
        };

        // Parse each result and accumulate statistics
        results.forEach(result => {
            const dzeData = JSON.parse(result);
            const objects = dzeData.EditorObjects || [];
            
            allStats.totalObjects += objects.length;
            objects.forEach(obj => {
                allStats.uniqueObjects.add(obj.Type);
                allStats.heights.push(obj.Position[1]);
                allStats.minX = Math.min(allStats.minX, obj.Position[0]);
                allStats.maxX = Math.max(allStats.maxX, obj.Position[0]);
                allStats.minZ = Math.min(allStats.minZ, obj.Position[2]);
                allStats.maxZ = Math.max(allStats.maxZ, obj.Position[2]);
            });
        });

        // Calculate final statistics
        const avgHeight = allStats.heights.length > 0 
            ? Math.round((allStats.heights.reduce((a, b) => a + b, 0) / allStats.heights.length) * 100) / 100 
            : 0;
        const buildArea = (allStats.maxX - allStats.minX) * (allStats.maxZ - allStats.minZ);

        // Update statistics display
        document.getElementById('totalObjects').textContent = allStats.totalObjects;
        document.getElementById('uniqueObjects').textContent = allStats.uniqueObjects.size;
        document.getElementById('avgHeight').textContent = `${avgHeight}m`;
        document.getElementById('buildArea').textContent = `${Math.round(buildArea)}m²`;
        document.querySelector('.statistics-panel').style.display = 'block';

        // Save to server
        const filename = DZEConverter.generateFilename();
        const response = await fetch('./config/process.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonData: results.join('\n\n'),
                filename: filename,
                isBulk: true
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        // Update output
        outputEditor.setValue(results.join('\n\n'));
        outputEditor.refresh();
        downloadBtn.setAttribute('data-filename', data.filename);

        // Show success message
        Swal.fire({
            icon: 'success',
            title: 'Bulk Conversion Complete',
            html: `
                <div class="mb-2">Successfully converted ${results.length} JSON blocks</div>
                <div class="small text-muted">Total objects processed: ${allStats.totalObjects}</div>
            `,
            timer: 3000,
            timerProgressBar: true
        });

    } catch (error) {
        // Show error message
        Swal.fire({
            icon: 'error',
            title: 'Conversion Error',
            text: error.message,
            confirmButtonText: 'OK'
        });
    }
} else {
				// Single file processing
				const data = JSON.parse(jsonInput);				
				

				// Show processing dialog if file is large
				if (data.Objects && data.Objects.length > 1000) {
					try {
						console.log('Starting processing...', data.Objects.length);
						let processedObjects = [];
						let currentProgress = 0;

						// Add modal HTML if it doesn't exist
						if (!document.getElementById('processing-modal')) {
							const modalHTML = `
							<div id="processing-modal" class="modal fade" tabindex="-1">
								<div class="modal-dialog modal-lg">
									<div class="modal-content bg-dark text-light">
										<div class="modal-header border-0">
											<h4 class="modal-title d-flex align-items-center">
												<i class="fas fa-cog fa-spin me-3"></i>
												Processing Objects
											</h4>
										</div>
										<div class="modal-body px-4 pb-4">
											<!-- Progress Section -->
											<div class="progress-section mb-5">
												<div class="section-header d-flex align-items-center mb-3">
													<div class="header-line me-3"></div>
													<h5 class="m-0">Conversion Progress</h5>
													<div class="header-line ms-3"></div>
												</div>
												<div class="content-box">
													<div id="progress-text" class="text-info mb-3">
														Preparing to process objects...
													</div>
													<div class="progress">
														<div id="progress-bar" 
															class="progress-bar progress-bar-striped progress-bar-animated" 
															role="progressbar" 
															style="width: 0%">
														</div>
													</div>
												</div>
											</div>

											<!-- Google Ad Section -->
											<div class="ad-section mb-5">
												<div class="section-header d-flex align-items-center mb-3">
													<div class="header-line me-3"></div>
													<h5 class="m-0">Sponsored Content</h5>
													<div class="header-line ms-3"></div>
												</div>
												<div class="content-box">
													<div id="google-ad-container" class="text-center p-3">
														<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3582774588006285"
															crossorigin="anonymous"></script>
														<ins class="adsbygoogle"
															style="display:block"
															data-ad-client="ca-pub-3582774588006285"
															data-ad-slot="2656378149"
															data-ad-format="auto"
															data-full-width-responsive="true"></ins>
														<script>
															(adsbygoogle = window.adsbygoogle || []).push({});
														</script>
													</div>
												</div>
											</div>

											<!-- Affiliate Ads Section -->
											<div class="affiliate-section mb-5">
												<div class="section-header d-flex align-items-center mb-3">
													<div class="header-line me-3"></div>
													<h5 class="m-0">Partner Recommendations</h5>
													<div class="header-line ms-3"></div>
												</div>
												<div class="row g-4">
													<div class="col-md-6">
														<div class="content-box h-100">
															<div class="affiliate-content">
																Affiliate Ad Space 1
															</div>
														</div>
													</div>
													<div class="col-md-6">
														<div class="content-box h-100">
															<div class="affiliate-content">
																Affiliate Ad Space 2
															</div>
														</div>
													</div>
												</div>
											</div>

											<!-- Donation Section -->
											<div class="donation-section">
												<div class="section-header d-flex align-items-center mb-3">
													<div class="header-line me-3"></div>
													<h5 class="m-0">Support Our Project</h5>
													<div class="header-line ms-3"></div>
												</div>
												<div class="content-box text-center">
													<p class="mb-3">Help us maintain and improve our tools</p>
													<form action="https://www.paypal.com/donate" method="post" target="_blank">
														<!-- PayPal business ID/email -->
														<input type="hidden" name="business" value="ozziehouso@dayzboosterz.com" />
														<!-- Optional parameters -->
														<input type="hidden" name="item_name" value="Support DayZ BoosterZ" />
														<input type="hidden" name="currency_code" value="USD" />
														<button type="submit" class="btn btn-gradient">
															<i class="fas fa-heart me-2"></i>
															Support via PayPal
														</button>
													</form>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>`;

							// Add this CSS
							const modalCSS = `
							<style>
								#processing-modal .modal-content {
									background: linear-gradient(145deg, #1a1c1e, #23272a);
									border: none;
									border-radius: 16px;
								}

								#processing-modal .modal-header {
									padding: 1.5rem 2rem;
								}

								#processing-modal .modal-title {
									font-size: 1.5rem;
									font-weight: 600;
									color: #fff;
								}

								#processing-modal .modal-title i {
									color: #3b82f6;
								}

								.section-header {
									position: relative;
								}

								.section-header h5 {
									color: #94a3b8;
									font-size: 0.9rem;
									font-weight: 600;
									text-transform: uppercase;
									letter-spacing: 1px;
								}

								.header-line {
									height: 1px;
									background: linear-gradient(90deg, transparent, #94a3b8, transparent);
									flex-grow: 1;
									opacity: 0.2;
								}

								.content-box {
									background: rgba(255, 255, 255, 0.03);
									border: 1px solid rgba(255, 255, 255, 0.05);
									border-radius: 12px;
									padding: 1.5rem;
									transition: transform 0.2s, box-shadow 0.2s;
								}

								.content-box:hover {
									transform: translateY(-2px);
									box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
								}

								#processing-modal .progress {
									height: 12px;
									background: rgba(0, 0, 0, 0.2);
									border-radius: 6px;
									overflow: hidden;
								}

								#processing-modal .progress-bar {
									background: linear-gradient(90deg, #3b82f6, #2563eb);
									border-radius: 6px;
								}

								#progress-text {
									font-size: 1.1rem;
									color: #94a3b8;
								}

								.btn-gradient {
									background: linear-gradient(90deg, #3b82f6, #2563eb);
									color: white;
									border: none;
									border-radius: 8px;
									padding: 0.75rem 1.5rem;
									font-weight: 500;
									transition: opacity 0.2s;
								}

								.btn-gradient:hover {
									opacity: 0.9;
									color: white;
								}

								.affiliate-content {
									min-height: 150px;
									display: flex;
									align-items: center;
									justify-content: center;
									color: #94a3b8;
								}

								@media (max-width: 768px) {
									#processing-modal .modal-body {
										padding: 1rem;
									}
									
									.section-header h5 {
										font-size: 0.8rem;
									}
								}
							</style>`;

							document.body.insertAdjacentHTML('beforeend', modalHTML);
							document.head.insertAdjacentHTML('beforeend', modalCSS);
						}

						// Show modal
						const processingModal = new bootstrap.Modal(document.getElementById('processing-modal'), {
							backdrop: 'static',
							keyboard: false
						});
						processingModal.show();

						// Process in chunks
						const chunkSize = 10;
						const totalObjects = data.Objects.length;

						for (let i = 0; i < totalObjects; i += chunkSize) {
							const chunk = data.Objects.slice(i, i + chunkSize);
							
							// Process chunk
							const processedChunk = chunk.map(obj => ({
								Type: obj.name,
								DisplayName: obj.name,
								Position: obj.pos,
								Orientation: obj.ypr,
								Scale: obj.scale,
								Flags: 2147483647
							}));
							
							processedObjects = processedObjects.concat(processedChunk);
							
							// Update progress
							currentProgress = Math.min(i + chunkSize, totalObjects);
							const percentage = Math.round((currentProgress / totalObjects) * 100);
							
							document.getElementById('progress-bar').style.width = `${percentage}%`;
							document.getElementById('progress-text').textContent = 
								`Processing ${currentProgress} of ${totalObjects} objects (${percentage}%)`;

							// Brief pause to allow UI update
							await new Promise(resolve => setTimeout(resolve, 50));
						}

						// Hide modal
						processingModal.hide();

						// Create final structure
						const selectedMap = DZEConverter.getSelectedMap();
						const lastPosition = processedObjects[processedObjects.length - 1]?.Position;
						
						const dzeStructure = {
							MapName: selectedMap,
							CameraPosition: DZEConverter.getCameraPosition(lastPosition, selectedMap),
							EditorObjects: processedObjects,
							EditorDeletedObjects: []
						};

						// Save to server
						const filename = DZEConverter.generateFilename();
						const response = await fetch('./config/process.php', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								jsonData: JSON.stringify(dzeStructure, null, 2),
								filename: filename
							}),
							credentials: 'include'
						});

						const saveData = await response.json();
						if (!saveData.success) throw new Error(saveData.error || 'Save failed');

						// Update editor
						outputEditor.setValue(JSON.stringify(dzeStructure, null, 2));
						outputEditor.refresh();
						
						// Update statistics
						const stats = DZEConverter.calculateStatistics(data);
						document.getElementById('totalObjects').textContent = stats.totalObjects;
						document.getElementById('uniqueObjects').textContent = stats.uniqueObjects;
						document.getElementById('avgHeight').textContent = `${stats.avgHeight}m`;
						document.getElementById('buildArea').textContent = `${stats.buildArea}m²`;

						// Show statistics panel
						document.querySelector('.statistics-panel').style.display = 'block';

						// Set download filename
						downloadBtn.setAttribute('data-filename', saveData.filename);

						// Show success
						await Swal.fire({
							icon: 'success',
							title: 'Complete',
							text: `Processed ${totalObjects} objects successfully`,
							timer: 2000
						});

					} catch (error) {
						console.error('Processing error:', error);
						// Hide processing modal if it's open
						bootstrap.Modal.getInstance(document.getElementById('processing-modal'))?.hide();
						await Swal.fire({
							icon: 'error',
							title: 'Error',
							text: error.message || 'Processing failed'
						});
					}
				} else {
					// Regular processing for smaller files
					DZEConverter.validateJSON(jsonInput, false);
					const result = DZEConverter.convertJSONtoDZE(jsonInput);
					const stats = DZEConverter.calculateStatistics(data);
					
					document.getElementById('totalObjects').textContent = stats.totalObjects;
					document.getElementById('uniqueObjects').textContent = stats.uniqueObjects;
					document.getElementById('avgHeight').textContent = `${stats.avgHeight}m`;
					document.getElementById('buildArea').textContent = `${stats.buildArea}m²`;
					
					document.querySelector('.statistics-panel').style.display = 'block';
					
					const filename = DZEConverter.generateFilename();
					const response = await fetch('./config/process.php', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							jsonData: result,
							filename: filename
						})
					});

					const saveData = await response.json();
					if (saveData.error) throw new Error(saveData.error);

					outputEditor.setValue(result);
					outputEditor.refresh();
					downloadBtn.setAttribute('data-filename', saveData.filename);
					
					showNotification(`Conversion successful!`, 'success');
				}
			}
		} catch (error) {
			showNotification(error.message, 'error');
		}
	});
	
	

    // Clear button handler
    clearBtn.addEventListener('click', function() {
        inputEditor.setValue('');
        outputEditor.setValue('');
    });
    
    downloadBtn.addEventListener('click', function() {
		const filename = this.getAttribute('data-filename');
		const content = outputEditor.getValue();
		if (content) {
			const blob = new Blob([content], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename || DZEConverter.generateFilename();
			document.body.appendChild(a);
			a.click();
			URL.revokeObjectURL(url);
			document.body.removeChild(a);
		}
	});

    // Copy button handler
    copyBtn.addEventListener('click', function() {
        const content = outputEditor.getValue();
        if (content) {
            navigator.clipboard.writeText(content)
                .then(() => showNotification('Copied to clipboard!', 'success'))
                .catch(() => showNotification('Failed to copy to clipboard', 'error'));
        }
    });
	
	const defaultCameraCheck = document.getElementById('useDefaultCamera');
    const lastObjectCameraCheck = document.getElementById('useLastObjectCamera');
	const randomCameraCheck = document.getElementById('useRandomCamera');

    defaultCameraCheck.addEventListener('change', function() {
		if (this.checked) {
			lastObjectCameraCheck.checked = false;
			randomCameraCheck.checked = false;
		}
	});

	lastObjectCameraCheck.addEventListener('change', function() {
		if (this.checked) {
			defaultCameraCheck.checked = false;
			randomCameraCheck.checked = false;
		}
	});

	randomCameraCheck.addEventListener('change', function() {
		if (this.checked) {
			defaultCameraCheck.checked = false;
			lastObjectCameraCheck.checked = false;
		}
	});

    // Auto-resize editors on window resize
    window.addEventListener('resize', function() {
        inputEditor.refresh();
        outputEditor.refresh();
    });
	
	setInterval(refreshSession, 600000);
	
});

// Utility function for notifications
function showNotification(message, type) {
    Swal.fire({
        title: type === 'error' ? 'Error' : 'Success',
        text: message,
        icon: type,
        customClass: {
            confirmButton: 'btn btn-primary'
        },
        buttonsStyling: false,
        toast: false,
        position: 'center',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

function refreshSession() {
    fetch('../../assets/globals/session-refresh.php', { 
        method: 'GET',
        credentials: 'include' 
    })
    .then(response => {
        if (!response.ok) {
            console.log('Session refresh failed');
        }
    })
    .catch(error => {
        console.error('Session refresh error:', error);
    });
}

function handleAuthError() {
    // Save current work to localStorage
    const currentInput = inputEditor.getValue();
    if (currentInput.trim() !== '') {
        localStorage.setItem('jsonDzeLastInput', currentInput);
    }

    Swal.fire({
        title: 'Session Expired',
        text: 'Your session has expired. Please login again to continue.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Login Now',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            // Redirect to login page with return URL
            window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.href);
        }
    });
}