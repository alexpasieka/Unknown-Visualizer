"use strict";

window.onload = () => {
	// creates and initializes all of the audio visualizer and controls
	function createVisualizer() {
		// responsive design
		const resizeCanvas = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};
		window.onresize = resizeCanvas;

		// getting references to DOM elements
		const canvas = document.querySelector('canvas');
		const ctx = canvas.getContext('2d');
		const controls = document.querySelector('#controls');
		const audioElement = document.querySelector('audio');

		// control references
		const invertCheck = document.querySelector('#invertCheck');
		const waveformCheck = document.querySelector('#waveformCheck');
		const reverbCheck = document.querySelector('#reverbCheck');
		const dashCheck = document.querySelector('#dashCheck');
		const songSelect = document.querySelector('#songSelect');
		const hexPicker = document.querySelector('#hexPicker');
		const sampleSelect = document.querySelector('#sampleSelect');
		const widthSlider = document.querySelector('#widthSlider');
		const intensitySlider = document.querySelector('#intensitySlider');
		const controlMinimizer = document.querySelector('#controlMinimizer');
		const clickBar = document.querySelector('#clickBar');

		// default values
		let invert = 1;
		let waveform = false;
		let reverb = false;
		let dashed = false;
		let lineColor = '#fff';
		let lineWidth;
		let lineIntensity = 2;
		let minimized = true;
		let paused = true;

		/* Audio Visualizer */

		// number of samples (actually half of this)
		let numSamples = 4096;
		let frequenciesPerLine = 32;
		let lineAmount = numSamples / frequenciesPerLine / 2;
		lineAmount -= parseInt(lineAmount / 3.5); // removes unmoving lines

		// audio hook ups
		let audioCtx = new AudioContext();
		let analyzerNode = audioCtx.createAnalyser();
		analyzerNode.fftSize = numSamples;
		let sourceNode = audioCtx.createMediaElementSource(audioElement);
		sourceNode.connect(analyzerNode);
		analyzerNode.connect(audioCtx.destination);

		// reverb node
		let convolverNode = audioCtx.createConvolver();
		/* code taken from https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer */
			let buffer = audioCtx.createBuffer(2, audioCtx.sampleRate * 3, audioCtx.sampleRate);
			for (let i = 0; i < buffer.numberOfChannels; i++) {
				let nowBuffering = buffer.getChannelData(i);
				for (let j = 0; j < buffer.length; j++) {
					nowBuffering[j] = Math.random() * 2 - 1;
				}
			}
		convolverNode.buffer = buffer;
		sourceNode.connect(convolverNode);

		// generates values for the number of samples select
		const listSamples = () => {
			const max = 8192;
			for (let i = 64; i < max; i *= 2) {
				let option = document.createElement('option');
				option.appendChild(document.createTextNode(i.toString()));
				option.value = i;
				sampleSelect.appendChild(option);
			}
			sampleSelect.value = numSamples;
		};

		listSamples();
		resizeCanvas();
		update();

		// called every frame
		function update() {
			requestAnimationFrame(update);

			// center of window
			const center = {
				x: canvas.width / 2,
				y: canvas.height / 2
			};

			// clearing the canvas every frame
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// setting line color and width
			ctx.strokeStyle = lineColor;
			ctx.lineWidth = lineWidth;

			// showing audio frequency
			const renderFrequencyData = () => {
				// array of displayed lines
				let lineArray = new Array(lineAmount);

				// for each line, create an array of segments
				for (let i = 0; i < lineAmount; i++) {
					lineArray[i] = new Array(frequenciesPerLine);
					for (let j = 0; j < frequenciesPerLine; j++) {
						lineArray[i][j] = data[(i * frequenciesPerLine) + j];
					}
				}

				// spacing the lines out evenly on the y axis
				for (let i = 0; i < lineAmount; i++) {
					let yOffset = (center.y / 2) +  (i * center.y) / 50;
					ctx.setLineDash(dashed ? [1, 10]: []);
					ctx.beginPath();

					// length of transition between margins and the middle
					const transitionLength = 3;

					// used for transition
					let counterUp = 1;
					let counterDown = transitionLength + 1;

					// for each segment in a line
					for (let j = 1; j < frequenciesPerLine; j++) {
						let frequency = lineArray[i][j];

						// margins
						if (j < frequenciesPerLine / 4 || j > 3 * (frequenciesPerLine / 4)) {
							frequency /= 10 * lineIntensity;
						}
						// middle
						else {
							frequency /= lineIntensity;
						}

						// left side transition
						if (j >= frequenciesPerLine / 4 && j <= (frequenciesPerLine / 4) + transitionLength) {
							frequency /= 5 / counterUp;
							counterUp++;
						}
						// right side transition
						if (j >= (3 * (frequenciesPerLine / 4)) - transitionLength && j <= 3 * (frequenciesPerLine / 4)) {
							frequency /= 5 / counterDown;
							counterDown--;
						}

						// finishing the line segment
						ctx.lineTo(center.x / 2 + j * center.x / 32, yOffset - frequency * invert);
					}
					// stroke the lines
					ctx.stroke();
				}
			};

			// showing audio waveform
			const renderWaveformData = () => {
				// spacing the lines out evenly on the y axis
				for (let i = 0; i < lineAmount / 4; i++) {
					let yOffset = center.y + (i * center.y) / 15;
					ctx.setLineDash(dashed ? [1, 10]: []);
					ctx.beginPath();

					// for each segment in a line
					for (let i = 0; i < data.length; i++) {
						// finishing the line segment
						ctx.lineTo(center.x / 2 + i * center.x / data.length, yOffset - data[i]);
					}
					// stroke the lines
					ctx.stroke();
				}
			};

			// setting number of samples
			analyzerNode.fftSize = numSamples;

			// updating audio data
			let data = new Uint8Array(analyzerNode.frequencyBinCount);

			// toggling between frequency and waveform data
			if (!waveform) {
				// frequency data
				analyzerNode.getByteFrequencyData(data);
				renderFrequencyData();
			}
			else {
				// waveform data
				analyzerNode.getByteTimeDomainData(data);
				renderWaveformData();
			}
		}

		/* Controls */

		// invert check
		invertCheck.onchange = () => {
			invert *= -1;
		};

		// waveform check
		waveformCheck.onchange = () => {
			waveform = !waveform;
		};

		// reverb check
		reverbCheck.onchange = () => {
			reverb = !reverb;
			if (reverb) {
				convolverNode.connect(audioCtx.destination);
			}
			else {
				convolverNode.disconnect(audioCtx.destination);
			}
		};

		// dash check
		dashCheck.onchange = () => {
			dashed = !dashed;
		};

		// song select
		songSelect.onchange = e => {
			  audioElement.src = 'music/' + e.target.value + '.mp3'
		};

		// hex color picker
		hexPicker.onchange = e => {
			lineColor = '#' + e.target.value;
		};

		// sample number select
		sampleSelect.onchange = e => {
			numSamples = e.target.value;
			// removes unmoving lines
			lineAmount = numSamples / frequenciesPerLine / 2;
			lineAmount -= parseInt(lineAmount / 3.5);
		};

		// line width slider
		widthSlider.oninput = e => {
			lineWidth = e.target.value;
		};

		// line intensity slider
		intensitySlider.oninput = e => {
			lineIntensity = e.target.value;
		};

		// control minimization
		clickBar.onclick = () => {
			minimized = !minimized;
			if (minimized) {
				controlMinimizer.classList.remove('minimized');
				controls.classList.add('minimized');
			}
			else {
				controlMinimizer.classList.add('minimized');
				controls.classList.remove('minimized');
			}
		};

		// spacebar play/pause
		window.onkeypress = e => {
			if(e.key === ' ') {
				paused = !paused;
				if(paused) {
					audioElement.play();
				}
				else {
					audioElement.pause();
				}
			}
		};

		// permenantly removing the start button
		document.querySelector('#start').style.display = "none";
	}

	// this start button is mainly here because audio contexts cannot be created before some amount
	// of user interaction with the page (autoplay with window.load is no longer supported)
	document.querySelector('#start').addEventListener('click', createVisualizer);
};