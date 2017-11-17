MusicsData = function(newFile,newBuffer) {
	this.file = newFile ;
	this.buffer = newBuffer ;
}


window.fftSize = 64;
window.Spectrumdata = new Float32Array(64);
window.OutputData = new Float32Array(64);
window.LengthTime = 0;
window.PlayBackTime = 0;
window.PlayBackNormalizedTime = function() {
	 return window.PlayBackTime/window.LengthTime;
}
window.CurrentVisualizer = null;


window.isPlaying = 0;//0 = pause ; 1 = playing ; -1 = stop ;
window.isLoading = 0;
window.isLoop = 1;
window.checkMusicsList = 0;
window.CurrentMusic = 0;
window.MusicsDataList = [];


MusicsInput = document.getElementById('uploadedFile');


function close_window() {
  if (confirm("Close Window?")) {
    close();
  }
};
function OnSeekBarChange(val) {
	
	Pause();
	
	var that = window.CurrentVisualizer ;
	
	var newTime = val * LengthTime;

	window.PlayBackTime = newTime;
	
	Play(CurrentMusic);
};

function Play(val) {
	
	if (MusicsDataList.length === 0 && val >= MusicsDataList.length ){
		return;
	}

	var curData = MusicsDataList[val];
	var that = window.CurrentVisualizer;
	that.file = MusicsDataList[val].file;
	if (that.file === undefined)
		return;
	if (MusicsDataList[val].buffer === null){
		that._start();
	}else{
		that.source.disconnect();
		that.source.stop(0);
		that.source = null;
		
		
		var audioContext = that.audioContext;
		that.LastTime =  that.audioContext.currentTime-window.PlayBackTime;

		var source = audioContext.createBufferSource();
		source.connect(that.analyser);
		source.loop = window.isLoop == 1;
		that.analyser.connect(audioContext.destination);
		
		
		source.buffer = window.MusicsDataList[val].buffer;

		if (window.PlayBackTime > window.LengthTime){
			that.LastTime =  that.audioContext.currentTime;
			window.PlayBackTime = 0;
		}
		
		source.start(0, window.PlayBackTime);

		that.source = source;


		that.animationId = requestAnimationFrame(GetSpectrumData);
	}


	
	window.isPlaying = 1;

	

};
function Pause() {
	console.log("Pause");
	if (window.isPlaying < 1  || window.CurrentVisualizer.source == null)
		return;
	 
    var source = window.CurrentVisualizer.source;
	source.disconnect();
	source.stop(0);
    source = null;
	if (window.CurrentVisualizer.animationId !== null) {
		cancelAnimationFrame(window.CurrentVisualizer.animationId);
	}
	
	
	window.isPlaying = 0;
	

};
function GetSpectrumData() {

	var that = window.CurrentVisualizer;
	analyser = window.CurrentVisualizer.analyser;

	if (window.isPlaying === 1){
		window.PlayBackTime = that.audioContext.currentTime - that.LastTime;
		
		if (window.PlayBackTime > window.LengthTime){
			if (window.isLoop === 1){
				that.LastTime =  that.audioContext.currentTime;
				window.PlayBackTime = 0;
			}else{
				Pause();
			}
		}

		
		window.Spectrumdata = new Float32Array(window.fftSize);
		window.OutputData = new Float32Array(window.fftSize);
		
		analyser.getFloatFrequencyData(window.Spectrumdata);
		analyser.getFloatTimeDomainData(window.OutputData);

		for(i=0;i<64;i++){
			window.Spectrumdata[i] = Number.parseFloat(((window.Spectrumdata[i]/1000) *-1));	
			if (isNaN(window.Spectrumdata[i])){
				console.log('Spectrumdata[i] isNaN.');
				window.Spectrumdata[i] = 0.01;
			}
		}
		// window.Spectrumdata = window.OutputData ;
		
		window.CurrentVisualizer.animationId = requestAnimationFrame(GetSpectrumData);
	}else{
		cancelAnimationFrame(window.CurrentVisualizer.animationId);
	}

};


window.onload = function() {
    new Visualizer().ini();
};

var Visualizer = function() {
    this.file = null; //the current file
    this.fileName = null; //the current file name
    this.audioContext = null;
	this.analyser = null;
    this.source = null; //the audio source
	this.gainNode = null;
    this.info = document.getElementById('info').innerHTML; //used to upgrade the UI information
    this.infoUpdateId = null; //to store the setTimeout ID and clear the interval
    this.animationId = null;
    this.status = 0; //flag for sound is playing 1 or stopped 0
    this.forceStop = false;
    this.allCapsReachBottom = false;
	this.LastTime = 0;
	

};
Visualizer.prototype = {
    ini: function() {
        this._prepareAPI();
        this._addEventListner();
		window.CurrentVisualizer = this;
    },
    _prepareAPI: function() {
        //fix browser vender for AudioContext and requestAnimationFrame
        window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
        window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
        window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
        try {
            this.audioContext = new AudioContext();
			
        } catch (e) {
            this._updateInfo('!Your browser does not support AudioContext', false);
            console.log(e);
        }
    },
    _addEventListner: function() {
        var that = this,
            audioInput = document.getElementById('uploadedFile'),
            dropContainer = document.getElementsByTagName("canvas")[0];
        //listen the file upload
		audioInput.onchange = function() {
            if (that.audioContext===null) {return;};
			window.checkMusicsList = 1;

            //the if statement fixes the file selction cancle, because the onchange will trigger even the file selection been canceled
            if (audioInput.files.length !== 0) {

                //only process the first file
                that.file = audioInput.files[0];
				for(i=0;i<audioInput.files.length;i++){
					window.MusicsDataList[i] = new window.MusicsData(audioInput.files[i],null);
				}
					
                that.fileName = that.file.name;
                if (that.status === 1) {
                    //the sound is still playing but we upload another file, so set the forceStop flag to true
                    that.forceStop = true;
                };
                document.getElementById('fileWrapper').style.opacity = 1;
                that._updateInfo('Uploading', true);
                //once the file is ready,start the visualizer
                that._start();
            };	

        };

        //listen the drag & drop
        dropContainer.addEventListener("dragenter", function() {
            document.getElementById('fileWrapper').style.opacity = 1;
            that._updateInfo('Drop it on the page', true);
        }, false);
        dropContainer.addEventListener("dragover", function(e) {
            e.stopPropagation();
            e.preventDefault();
            //set the drop mode
            e.dataTransfer.dropEffect = 'copy';
        }, false);
        dropContainer.addEventListener("dragleave", function() {
            document.getElementById('fileWrapper').style.opacity = 0.2;
            that._updateInfo(that.info, false);
        }, false);
        dropContainer.addEventListener("drop", function(e) {
            e.stopPropagation();
            e.preventDefault();
            if (that.audioContext===null) {return;};
            document.getElementById('fileWrapper').style.opacity = 1;
            that._updateInfo('Uploading', true);
            //get the dropped file
            that.file = e.dataTransfer.files[0];
            if (that.status === 1) {
                document.getElementById('fileWrapper').style.opacity = 1;
                that.forceStop = true;
            };
            that.fileName = that.file.name;
            //once the file is ready,start the visualizer
            that._start();
        }, false);
    },
    _start: function() {

        //read and decode the file into audio array buffer
        var that = this,
            file = this.file,
            fr = new FileReader();
			

        fr.onload = function(e) {

            var fileResult = e.target.result;
            var audioContext = that.audioContext;
            if (audioContext === null) {
                return;
            };
            that._updateInfo('Decoding the audio', true);
			window.isLoading = 1;
            audioContext.decodeAudioData(fileResult, function(buffer) {
				
				window.MusicsDataList[CurrentMusic].buffer = buffer;
				
                that._updateInfo('Decode succussfully,start the visualizer', true);
                that._visualize(audioContext, buffer);
				window.isLoading = 0;
            }, function(e) {
                that._updateInfo('!Fail to decode the file', false);
                console.error(e);
				window.isLoading = 0;
				window.isPlaying = -1;
            });
        };
        fr.onerror = function(e) {
            that._updateInfo('!Fail to read the file', false);
            console.error(e);
        };
        //assign the file to the reader
        this._updateInfo('Starting read the file', true);
        fr.readAsArrayBuffer(file);
		
    },
    _visualize: function(audioContext, buffer) {
	
        var audioBufferSouceNode = audioContext.createBufferSource(),
            analyser = audioContext.createAnalyser(),
            that = this;
		analyser.fftSize = window.fftSize;
		that.gainNode = audioContext.createGain();
		that.analyser = analyser;
        //connect the source to the analyser
        audioBufferSouceNode.connect(analyser);
        //connect the analyser to the destination(the speaker), or we won't hear the sound
        analyser.connect(audioContext.destination);
        //then assign the buffer to the buffer source node
        audioBufferSouceNode.buffer = buffer;

		window.LengthTime = buffer.duration;
		
        //play the source
        if (!audioBufferSouceNode.start) {
            audioBufferSouceNode.start = audioBufferSouceNode.noteOn //in old browsers use noteOn method
            audioBufferSouceNode.stop = audioBufferSouceNode.noteOff //in old browsers use noteOff method
        };
        //stop the previous sound if any
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.source !== null) {
            this.source.stop(0);
        }
		that.LastTime =  that.audioContext.currentTime-window.PlayBackTime;
        audioBufferSouceNode.start(0,window.PlayBackTime);
		audioBufferSouceNode.loop = window.isLoop == 1;
        this.status = 1;
        this.source = audioBufferSouceNode;
		this.source.connect(that.gainNode);
		that.gainNode.connect(audioContext.destination);
        audioBufferSouceNode.onended = function() {
            that._audioEnd(that);
        };
		
        this._updateInfo('Playing ' + this.fileName, false);
        this.info = 'Playing ' + this.fileName;
        document.getElementById('fileWrapper').style.opacity = 0.2;
        this.animationId = requestAnimationFrame(GetSpectrumData);
		window.isPlaying = 1;
    },
    _audioEnd: function(instance) {
        if (this.forceStop) {
            this.forceStop = false;
            this.status = 1;
            return;
        };
        this.status = 0;
        var text = 'HTML5 Audio API showcase | An Audio Viusalizer';
        document.getElementById('fileWrapper').style.opacity = 1;
        document.getElementById('info').innerHTML = text;
        instance.info = text;
        document.getElementById('uploadedFile').value = '';
    },
    _updateInfo: function(text, processing) {
        var infoBar = document.getElementById('info'),
            dots = '...',
            i = 0,
            that = this;
        infoBar.innerHTML = text + dots.substring(0, i++);
        if (this.infoUpdateId !== null) {
            clearTimeout(this.infoUpdateId);
        };
        if (processing) {
            //animate dots at the end of the info text
            var animateDot = function() {
                if (i > 3) {
                    i = 0
                };
                infoBar.innerHTML = text + dots.substring(0, i++);
                that.infoUpdateId = setTimeout(animateDot, 250);
            }
            this.infoUpdateId = setTimeout(animateDot, 250);
        };
    },
}

