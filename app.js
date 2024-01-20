'use strict' ; //provide better errors
const switcher = document.querySelector('.btn'); //variable switcher as reference to the button: 
                 //document.queryselector handles css selectors
switcher.addEventListener('click',function(){ //adding the event handler for click event; Listener for the 'click' event
    document.body.classList.toggle('light-theme'); //toggle method modify 'body' element's class attribute
    document.body.classList.toggle('dark-theme');

    //to update the label of the button with the correct theme
    //if theme is Light, label reads "Dark", else "Light"
    const className = document.body.className;
    if(className == "light-theme"){ 
        this.textContent = "Dark";
    } else  {
        this.textContent = "Light";
    }
    //concole messages to help see results of code
    console.log('Fred: ' + className)
});