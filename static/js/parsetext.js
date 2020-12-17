(function() {
    window.addEventListener("load", function() {
        var inputText = document.getElementById("input-text");
        if(inputText.innerHTML.length > 0) {
            inputText.innerHTML = inputText.innerHTML.replaceAll(".", ".<br>");
            inputText.innerHTML = inputText.innerHTML.replaceAll("-_**_-", "<br>----------------<br>");
        }
    });
})();