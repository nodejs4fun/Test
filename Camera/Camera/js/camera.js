// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
	"use strict";

	var app = WinJS.Application;
	var activation = Windows.ApplicationModel.Activation;

	app.onactivated = function (args) {
		if (args.detail.kind === activation.ActivationKind.launch) {
			if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
				// TODO: This application has been newly launched. Initialize your application here.
			} else {
				// TODO: This application was suspended and then terminated.
				// To create a smooth user experience, restore application state here so that it looks like the app never stopped running.
			}
			args.setPromise(WinJS.UI.processAll());

			var initButton = document.getElementById("initButton");
			initButton.addEventListener("click", initButtonClickHandler, false);

			var startButton = document.getElementById("startButton");
			startButton.addEventListener("click", startButtonClickHandler, false);

			var stopButton = document.getElementById("stopButton");
			stopButton.addEventListener("click", stopButtonClickHandler, false);
        }
	};

	app.oncheckpoint = function (args) {
		// TODO: This application is about to be suspended. Save any state that needs to persist across suspensions here.
		// You might use the WinJS.Application.sessionState object, which is automatically saved and restored across suspension.
		// If you need to complete an asynchronous operation before your application is suspended, call args.setPromise().
	};

	function initButtonClickHandler(eventInfo) {
	    // check https://msdn.microsoft.com/en-us/library/windows/apps/xaml/mt203788.aspx
	    var outString = "Initialization button has been clicked";
	    document.getElementById("Output").innerText = outString;
	}

	function startButtonClickHandler(eventInfo) {
	    var outString = "start media capture button has been clicked";
	    document.getElementById("Output").innerText = outString;
	}

	function stopButtonClickHandler(eventInfo) {
	    var outString = "stop media capture button has been clicked";
	    document.getElementById("Output").innerText = outString;
	}

	app.start();
})();
