// main.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize modules
    const EffectConverter = {
        init() {
            this.initializeCodeMirror();
            this.bindEventListeners();
            this.updateButtonLabels();
        },

        state: {
            drEvent: null,
            codeMirrorEditor: null
        },

        initializeCodeMirror() {
            const editor = document.getElementById("codeMirrorEditor");
            if (!editor) {
                console.error('CodeMirror textarea not found');
                return;
            }

            this.state.codeMirrorEditor = CodeMirror.fromTextArea(editor, {
                mode: "application/json",
                lineNumbers: false,
                theme: "darcula",
                readOnly: true,
                lineWrapping: true,
                gutters: [],
                viewportMargin: Infinity
            });
        },

        bindEventListeners() {
            this.bindClearFileButton();
            this.bindEffectCheckboxes();
            this.bindFormSubmission();
            this.bindMapSelectionChange();
            this.bindActionButtons();
        },

        // File handling
        bindClearFileButton() {
            document.getElementById('clearFile').addEventListener('click', () => {
                if (this.state.codeMirrorEditor.getValue().trim() === '') {
                    Swal.fire('Warning', 'There is nothing to clear.', 'warning');
                    return;
                }
                this.state.drEvent.clearElement();
                document.getElementById('jsonUploadForm').reset();
                this.state.codeMirrorEditor.setValue('');
            });
        },

        // Effect handling
        bindEffectCheckboxes() {
			const checkboxes = document.querySelectorAll('.effect-checkbox');
			const noSelection = document.getElementById('noSelection');
			checkboxes.forEach(checkbox => {
				checkbox.addEventListener('change', (e) => {
					checkboxes.forEach(cb => {
						if (cb !== e.target) cb.checked = false;
					});
					const imageContainer = document.getElementById('imageContainer');
					if (e.target.checked) {
						const effect = e.target.value;
						if (["HotSpringArea", "VolcanicArea", "GeyserArea"].includes(effect)) {
							imageContainer.style.display = 'none';
							noSelection.style.display = 'block';
						} else {
							const imageUrl = this.ImageHandler.getImageUrl(effect);
							document.getElementById('effectImage').src = imageUrl;
							imageContainer.style.display = 'block';
							noSelection.style.display = 'none';
						}
					} else {
						imageContainer.style.display = 'none';
						noSelection.style.display = 'block';
					}
				});
			});
		},

        // Form submission
        bindFormSubmission() {
            document.getElementById('jsonUploadForm').addEventListener('submit', (e) => {
                e.preventDefault();
                if (!document.getElementById('jsonFile').value) {
                    Swal.fire('Warning', 'Please upload a JSON file.', 'warning');
                    return;
                }

                const formData = new FormData(e.target);
                const selectedEffect = document.querySelector('.effect-checkbox:checked')?.value;
                if (selectedEffect) {
                    formData.append('selectedEffect', selectedEffect);
                }

                this.submitForm(formData);
            });
        },

        async submitForm(formData) {
			const spinner = document.getElementById('spinnerOverlay');
			if (spinner) spinner.style.display = 'flex';
			
			try {
				const response = await fetch('/apps/tools/config/effectConverter.php', {
					method: 'POST',
					body: formData
				});

				const responseText = await response.text();
				console.log('Raw response:', responseText);

				let data;
				try {
					data = JSON.parse(responseText);
				} catch (e) {
					console.error('JSON parse error:', e);
					Swal.fire('Error', 'Server response is not valid JSON. Check console for details.', 'error');
					return;
				}
				
				if (data.error) {
					Swal.fire('Error', data.error, 'error');
				} else {
					const formattedJson = JSON.stringify(data, null, 2);
					this.state.codeMirrorEditor.setValue(formattedJson);
				}
			} catch (error) {
				console.error('Fetch error:', error);
				Swal.fire('Error', 'Network error occurred while submitting the form. Please try again.', 'error');
			} finally {
				if (spinner) spinner.style.display = 'none';
			}
		},

        // Map handling
        MapHandler: {
            templates: {
                chernarus: `{
					"Areas": [
						{ "AreaName": "Ship-SW", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 13684, 0, 11073 ], "Radius": 100, "PosHeight": 22, "NegHeight": 10, "InnerRingCount": 1, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 50, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } },
						{ "AreaName": "Ship-NE", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 13881, 0, 11172 ], "Radius": 100, "PosHeight": 26, "NegHeight": 10, "InnerRingCount": 1, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 50, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } },
						{ "AreaName": "Ship-Central", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 13752, 0, 11164 ], "Radius": 100, "PosHeight": 22, "NegHeight": 2, "InnerRingCount": 1, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 60, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } },
						{ "AreaName": "Pavlovo-North", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 2043, 0, 3485 ], "Radius": 150, "PosHeight": 25, "NegHeight": 20, "InnerRingCount": 2, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 40, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } },
						{ "AreaName": "Pavlovo-South", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 2164, 0, 3335 ], "Radius": 150, "PosHeight": 11, "NegHeight": 10, "InnerRingCount": 2, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 40, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } }
					],
					"SafePositions": [
						[434, 13624], [360, 10986], [1412, 13505], [1290, 11773], [5742, 8568],
						[4191, 4620], [4949, 6569], [1018, 7138], [5041, 2640], [6895, 7915],
						[6128, 8120], [4422, 8117], [2811, 10209], [1954, 2417], [3633, 8708],
						[5222, 5737], [3546, 2630], [2373, 5516], [2462, 6879], [1653, 3600],
						[11774, 14570], [8228, 9345], [11100, 13400], [9333, 8697], [11513, 12203],
						[4955, 10603], [5090, 15054], [6513, 14579], [3483, 14941], [4016, 11194],
						[7607, 12384], [4307, 9528], [3266, 12352], [4432, 13285], [5473, 12455],
						[9731, 13685], [2745, 7784], [8492, 14128], [3501, 13292], [7912, 10943],
						[4165, 10134], [10536, 7871], [1467, 14288], [5479, 9709], [9453, 11963],
						[319, 9212], [8009, 14843], [7206, 7158], [12303, 13598], [3435, 5959],
						[4060, 12050], [6633, 2988], [870, 2095], [10286, 9071], [10371, 5690]
					]
				}`, 
                livonia: `{
					"Areas": [
						{ "AreaName": "Radunin-MedicalTents", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 7500, 0, 6156 ], "Radius": 200, "PosHeight": 21, "NegHeight": 10, "InnerRingCount": 2, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 40, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } },
						{ "AreaName": "Radunin-Village", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 7347, 0, 6410 ], "Radius": 200, "PosHeight": 18, "NegHeight": 10, "InnerRingCount": 2, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 40, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } },
						{ "AreaName": "Radunin-Military-North", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 7791, 0, 6038 ], "Radius": 140, "PosHeight": 15, "NegHeight": 20, "InnerRingCount": 1, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 40, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } },
						{ "AreaName": "Radunin-Military-East", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 7884, 0, 5912 ], "Radius": 120, "PosHeight": 16, "NegHeight": 20, "InnerRingCount": 1, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 40, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } },
						{ "AreaName": "Radunin-Military-West", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 7651, 0, 5934 ], "Radius": 120, "PosHeight": 7, "NegHeight": 10, "InnerRingCount": 1, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 40, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } },
						{ "AreaName": "Radunin-Military-South", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 7798, 0, 5803 ], "Radius": 150, "PosHeight": 13, "NegHeight": 10, "InnerRingCount": 1, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 40, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } },
						{ "AreaName": "LukovAirfield-NE", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 4343, 0, 10467 ], "Radius": 200, "PosHeight": 8, "NegHeight": 15, "InnerRingCount": 2, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 40, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } },
						{ "AreaName": "LukovAirfield-SW", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 4064, 0, 10224 ], "Radius": 200, "PosHeight": 7, "NegHeight": 15, "InnerRingCount": 2, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 40, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } },
						{ "AreaName": "LukovAirfield-RunwayOutpost", "Type": "ContaminatedArea_Static", "TriggerType": "ContaminatedTrigger", "Data": { "Pos": [ 3787, 0, 10334 ], "Radius": 130, "PosHeight": 7, "NegHeight": 15, "InnerRingCount": 1, "InnerPartDist": 50, "OuterRingToggle": 1, "OuterPartDist": 40, "OuterOffset": 0, "VerticalLayers": 0, "VerticalOffset": 0, "ParticleName": "graphics/particles/contaminated_area_gas_bigass" }, "PlayerData": { "AroundPartName": "graphics/particles/contaminated_area_gas_around", "TinyPartName": "graphics/particles/contaminated_area_gas_around_tiny", "PPERequesterType": "PPERequester_ContaminatedAreaTint" } }
					],
					"SafePositions": [
						[8224, 9710], [8975, 6866], [5431, 2215], [11323, 4446], [11610, 664],
						[7732, 2834], [1229, 9794], [6245, 8033], [3186, 2284], [5588, 5527],
						[643, 5536], [7729, 5177], [8161, 8922], [5721, 4182], [2077, 11340],
						[9208, 4227], [4398, 6366], [9985, 8497], [3068, 6620], [5993, 6372],
						[9093, 2129], [10296, 2359], [4379, 4650], [7973, 10476], [10099, 3659],
						[3449, 11703], [2402, 5420]
					]
				}`, 
                sakhal: `{
					"Areas": [
						{ "AreaName": "Cluster1Area1A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8906, 0, 10913 ], "Radius": 12, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster1Area2A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8898, 0, 10934.5 ], "Radius": 10, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster1Area2B", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8884, 0, 10934 ], "Radius": 8, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster1Area2C", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8875.2, 0, 10925.5 ], "Radius": 8, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster1Area2D", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8873.25, 0, 10908 ], "Radius": 10, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster1Area2E", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8865.3, 0, 10916 ], "Radius": 8, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster1Area3A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8872.5, 0, 10878.5 ], "Radius": 10, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster1Area3B", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8862.2, 0, 10871 ], "Radius": 5, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster1Area3C", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8861.15, 0, 10864.25 ], "Radius": 5, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster1Area3D", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8864.5, 0, 10856.3 ], "Radius": 5, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster1Area3E", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8871.2, 0, 10850 ], "Radius": 10, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster1Area3F", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8856.1, 0, 10848.8 ], "Radius": 8, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster2Area1A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8695.8, 0, 10207.3 ], "Radius": 8, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster2Area2A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8700.75, 0, 10191.25 ], "Radius": 6, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster2Area2B", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8707.1, 0, 10186.6 ], "Radius": 8, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster2Area3A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8719.2, 0, 10188.8], "Radius": 6, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster2Area3B", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8721.7, 0, 10199 ], "Radius": 8, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster3Area1A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8357.35, 0, 9876 ], "Radius": 9, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster3Area1B", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 8348.75, 0, 9879.5 ], "Radius": 6, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster4Area1A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 7726.75, 0, 11534.1], "Radius": 6, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster4Area1B", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 7728.8, 0, 11528.12 ], "Radius": 6, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster4Area1C", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 7729.6, 0, 11519.45 ], "Radius": 8, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster4Area1D", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 7723.28, 0, 11514.5], "Radius": 10, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster4Area2A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 7739.55, 0, 11505.15], "Radius": 10, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster4Area3A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 7710.4, 0, 11504.35], "Radius": 6, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster4Area3B", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 7717.210, 0, 11501], "Radius": 6, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster4Area4A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 7687.4, 0, 11482.15 ], "Radius": 7, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster4Area4B", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 7676.4, 0, 11482.5], "Radius": 7, "PosHeight": 10, "NegHeight": 10 }},
						{ "AreaName": "Cluster5Area1A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 11445.5, 0, 11089.5 ], "Radius": 10, "PosHeight": 10, "NegHeight": 10 } },
						{ "AreaName": "Cluster5Area2A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 11317, 0, 11050 ], "Radius": 8, "PosHeight": 10, "NegHeight": 10 } },
						{ "AreaName": "Cluster5Area3A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 11311.7, 0, 11098 ], "Radius": 10, "PosHeight": 10, "NegHeight": 10 } },
						{ "AreaName": "Cluster5Area3B", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 11304.11, 0, 11097.8 ], "Radius": 10, "PosHeight": 10, "NegHeight": 10 } },
						{ "AreaName": "Cluster5Area4A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 11331, 0, 11110.8 ], "Radius": 8, "PosHeight": 10, "NegHeight": 10 } },
						{ "AreaName": "Cluster5Area4B", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 11336.6, 0, 11108.86 ], "Radius": 8, "PosHeight": 10, "NegHeight": 10 } },
						{ "AreaName": "Cluster5Area5A", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 11352.4, 0, 11181.4 ], "Radius": 7, "PosHeight": 10, "NegHeight": 10 } },
						{ "AreaName": "Cluster5Area5B", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 11358.8, 0, 11169 ], "Radius": 10, "PosHeight": 10, "NegHeight": 10 } },
						{ "AreaName": "Cluster5Area5C", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 11362.7, 0, 11175 ], "Radius": 10, "PosHeight": 10, "NegHeight": 10 } },
						{ "AreaName": "Cluster5Area5D", "Type": "HotSpringArea", "TriggerType": "HotSpringTrigger", "Data": { "Pos": [ 11374.1, 0, 11170.8 ], "Radius": 7, "PosHeight": 10, "NegHeight": 10 } },
						{ "AreaName": "VolcanoMouth1", "Type": "VolcanicArea", "TriggerType": "VolcanicTrigger", "Data": { "Pos": [ 10039.5, 0, 12010.3 ], "Radius": 8, "PosHeight": 20, "NegHeight": 10 }},
						{ "AreaName": "VolcanoMouth2", "Type": "VolcanicArea", "TriggerType": "VolcanicTrigger", "Data": { "Pos": [ 10031.9, 0, 12027.4 ], "Radius": 8, "PosHeight": 20, "NegHeight": 10 }},
						{ "AreaName": "VolcanoMouth3", "Type": "VolcanicArea", "TriggerType": "VolcanicTrigger", "Data": { "Pos": [ 10028.9, 0, 12014 ], "Radius": 8, "PosHeight": 20, "NegHeight": 10 }},
						{ "AreaName": "VolcanoMouth4", "Type": "VolcanicArea", "TriggerType": "VolcanicTrigger", "Data": { "Pos": [ 10050.1, 0, 12027.9 ], "Radius": 8, "PosHeight": 20, "NegHeight": 10 }}
					]
				}`     // Your existing Sakhal template
            },

            getTemplate(map) {
                return this.templates[map] || '';
            },

            appendToTemplate(jsonContent, map) {
                try {
                    const mapTemplate = this.getTemplate(map);
                    const parsedTemplate = mapTemplate ? JSON.parse(mapTemplate) : { "Areas": [], "SafePositions": [] };
                    const parsedJson = jsonContent ? JSON.parse(jsonContent) : { "Areas": [], "SafePositions": [] };

                    if (parsedJson.Areas?.length > 0) {
                        parsedTemplate.Areas.push(...parsedJson.Areas);
                    }
                    return JSON.stringify(parsedTemplate, null, 2);
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    Swal.fire('Error', 'An error occurred while processing the JSON data. Please check the input.', 'error');
                    return '';
                }
            }
        },

        // Image handling
        ImageHandler: {
            images: {
                "graphics/particles/water_jet": "/assets/img/effects/water_jet.png",
				"graphics/particles/water_jet_weak": "/assets/img/effects/water_jet_weak.png",
				"graphics/particles/water_spilling": "/assets/img/effects/water_spilling.png",
				"graphics/particles/fire_small_torch_01": "/assets/img/effects/fire_small_torch_01(01-03)_fire_bonfire.png",                    
				"graphics/particles/fire_small_house_01": "/assets/img/effects/smallhouse01.png",                    
				"graphics/particles/fire_small_camp_01": "/assets/img/effects/fire_small_camp_01.png",                    
				"graphics/particles/fire_medium_house_01": "/assets/img/effects/fire_medium_house_01.png",
				"graphics/particles/fire_bonfire": "/assets/img/effects/BonfireNew.png",
				"graphics/particles/env_fly_swarm_01": "/assets/img/effects/fly_swarm.png",
				"graphics/particles/smoke_M18_green_02": "/assets/img/effects/smoke_M18_green_02.png",
				"graphics/particles/smoke_M18_purple_02": "/assets/img/effects/smoke_M18_purple_02.png",
				"graphics/particles/smoke_M18_red_02": "/assets/img/effects/smoke_M18_red_02.png",
				"graphics/particles/smoke_M18_white_02": "/assets/img/effects/smoke_M18_white_02.png",
				"graphics/particles/smoke_M18_yellow_02": "/assets/img/effects/smoke_M18_yellow_02.png",
				"graphics/particles/cupid_bolt": "/assets/img/effects/cupid.png",
				"graphics/particles/fire_small_flare_blue_01": "/assets/img/effects/fire_small_flare_blue_01.png",
				"graphics/particles/fire_small_flare_green_01": "/assets/img/effects/fire_small_flare_green_01.png",
				"graphics/particles/fire_small_flare_red_01": "/assets/img/effects/fire_small_flare_red_01.png",
				"graphics/particles/fire_small_flare_yellow_01": "/assets/img/effects/fire_small_flare_yellow_01.png",
				"graphics/particles/fire_small_roadflare_red_03": "/assets/img/effects/fire_small_roadflare_red_03.png",
				"graphics/particles/fire_small_stove_01": "/assets/img/effects/fire_small_stove_01.png",
				"graphics/particles/menu_engine_fire": "/assets/img/effects/menu_engine_fire.png",
				"graphics/particles/smoke_bonfire": "/assets/img/effects/smoke_bonfire-1.png",
				"graphics/particles/smoke_generic_wreck": "/assets/img/effects/smoke_generic_wreck-1.png",
            },

            getImageUrl(effect) {
                return this.images[effect] || "";
            }
        },

        // Action buttons handling
        bindActionButtons() {
            document.getElementById('downloadEffect').addEventListener('click', () => 
                this.handleAction('download'));
            document.getElementById('copyJson').addEventListener('click', () => 
                this.handleAction('copy'));
        },

        async handleAction(action) {
            if (this.state.codeMirrorEditor.getValue().trim() === '') {
                Swal.fire('Warning', `There is no content to ${action}.`, 'warning');
                return;
            }

            const selectedMap = document.querySelector('input[name="mapSelection"]:checked')?.value;
            if (!selectedMap) {
                Swal.fire('Warning', `Please select a map before ${action}.`, 'warning');
                return;
            }

            const jsonContent = this.state.codeMirrorEditor.getValue();
            const finalJson = this.MapHandler.appendToTemplate(jsonContent, selectedMap);

            if (!finalJson) return;

            if (action === 'download') {
                await this.handleDownload(finalJson);
            } else if (action === 'copy') {
                await this.handleCopy(finalJson);
            }
        },

        async handleDownload(finalJson) {
            const { value: filename } = await Swal.fire({
                title: 'Enter filename',
                input: 'text',
                inputLabel: 'Filename',
                inputValue: 'converted_effect',
                showCancelButton: true,
                confirmButtonText: 'Download',
                showLoaderOnConfirm: true,
                preConfirm: (filename) => {
                    if (!filename) throw new Error('Filename is required');
                    return filename;
                }
            });

            if (filename) {
                const blob = new Blob([finalJson], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                Swal.fire('Downloaded', 'Your file has been downloaded.', 'success');
            }
        },

        async handleCopy(finalJson) {
            try {
                await navigator.clipboard.writeText(finalJson);
                Swal.fire('Copied', 'JSON content copied to clipboard.', 'success');
            } catch (err) {
                Swal.fire('Error', 'Failed to copy JSON content.', 'error');
            }
        },

        bindMapSelectionChange() {
            document.querySelectorAll('input[name="mapSelection"]')
                .forEach(radio => radio.addEventListener('change', () => this.updateButtonLabels()));
        },

        updateButtonLabels() {
            const selectedMap = document.querySelector('input[name="mapSelection"]:checked')?.value;
            const downloadBtn = document.getElementById('downloadEffect');
            const copyBtn = document.getElementById('copyJson');

            if (selectedMap && selectedMap !== 'none') {
                downloadBtn.textContent = 'Download Effect w/ default effects applied';
                copyBtn.textContent = 'Copy JSON w/ default effects applied';
            } else {
                downloadBtn.textContent = 'Download Effect';
                copyBtn.textContent = 'Copy JSON';
            }
        }
    };

    // Initialize the application
    EffectConverter.init();
});