
function getParameterByName(name) {
    url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

$(function () {
    clearInterval(refreshId);
    setScreen(false);

    // Declare a proxy to reference the hub.
    var chatHub = $.connection.chatHub;
    chatHub.connection.url = 'http://localhost:404/signalr';
    //$.connection.hub.logging = true;

    registerClientMethods(chatHub);

    // Start Hub
    $.connection.hub.start().done(function () {
        registerEvents(chatHub)
    });
});

// ------------------------------------------------------------------Variable ----------------------------------------------------------------------//
var loadMesgCount = 10;
var topPosition = 0;
var refreshId = null;

function scrollTop(ctrId) {
    var height = $('#' + ctrId).find('#divMessage')[0].scrollHeight;
    $('#' + ctrId).find('#divMessage').scrollTop(height);
}

// ------------------------------------------------------------------Start All Chat ----------------------------------------------------------------------//
function setScreen(isLogin) {
    if (!isLogin) {
        $("#divChat").hide();
    }
    else {
        $("#divChat").show();
    }
}

function registerEvents(chatHub) {

    var name = getParameterByName('Name');
    var email = getParameterByName('Mail');

    $('#hdEmailID').val(email);
    chatHub.server.connect(name, email);




}

function registerClientMethods(chatHub) {
    // Calls when user successfully logged in
    chatHub.client.onConnected = function (id, userName, allUsers, messages) {
        setScreen(true);

        $('#hdId').val(id);
        $('#hdUserName').val(userName);
        $('#spanUser').html(userName);

        // Add All Users
        for (i = 0; i < allUsers.length; i++) {
            AddUser(chatHub, allUsers[i].ConnectionId, allUsers[i].UserName, allUsers[i].EmailID);
        }

        // Add Existing Messages
        for (i = 0; i < messages.length; i++) {
            AddMessage(messages[i].UserName, messages[i].Message);
        }

        $('.login').css('display', 'none');
    }

    // On New User Connected
    chatHub.client.onNewUserConnected = function (id, name, email) {
        AddUser(chatHub, id, name, email);
    }

    // On User Disconnected
    chatHub.client.onUserDisconnected = function (id, userName) {
        $('#' + id).remove();

        var ctrId = 'private_' + id;
        $('#' + ctrId).remove();

        var disc = $('<div class="disconnect">"' + userName + '" logged off.</div>');

        $(disc).hide();
        $('#divusers').prepend(disc);
        $(disc).fadeIn(200).delay(2000).fadeOut(200);
    }

    // On User Disconnected Existing
    chatHub.client.onUserDisconnectedExisting = function (id, userName) {
        $('#' + id).remove();
        var ctrId = 'private_' + id;
        $('#' + ctrId).remove();
    }

    chatHub.client.messageReceived = function (userName, message) {
        AddMessage(userName, message);
    }

    chatHub.client.sendPrivateMessage = function (windowId, fromUserName, message, userEmail, email, status, fromUserId) {
        var ctrId = 'private_' + windowId;
        if (status == 'Click') {
            if ($('#' + ctrId).length == 0) {
                createPrivateChatWindow(chatHub, windowId, ctrId, fromUserName, userEmail, email);
                chatHub.server.getPrivateMessage(userEmail, email, loadMesgCount).done(function (msg) {
                    for (i = 0; i < msg.length; i++) {
                        $('#' + ctrId).find('#divMessage').append('<div class="message"><span class="userName">' + msg[i].userName + '</span>: ' + msg[i].message + '</div>');
                        // set scrollbar
                        scrollTop(ctrId);
                    }
                });
            }
            else {
                $('#' + ctrId).find('#divMessage').append('<div class="message"><span class="userName">' + fromUserName + '</span>: ' + message + '</div>');
                // set scrollbar
                scrollTop(ctrId);
            }
        }

        if (status == 'Type') {
            if (fromUserId == windowId)
                $('#' + ctrId).find('#msgTypeingName').text('typing...');
        }
        else { $('#' + ctrId).find('#msgTypeingName').text(''); }
    }
}

// Add User
function AddUser(chatHub, id, name, email) {
    var userId = $('#hdId').val();
    var userEmail = $('#hdEmailID').val();
    var code = "";

    if (userEmail == email && $('.loginUser').length == 0) {
        //  code = $('<div class="loginUser">' + name + "</div>");
    }
    else {
        code = $('<a id="' + id + '" class="user" >' + name + '<a>');
        $(code).click(function () {
            var id = $(this).attr('id');
            if (userEmail != email) {
                OpenPrivateChatWindow(chatHub, id, name, userEmail, email);
            }
        });
    }

    $("#divusers").append(code);
}


// ------------------------------------------------------------------End All Chat ----------------------------------------------------------------------//


// ------------------------------------------------------------------Start Private Chat ----------------------------------------------------------------------//
function OpenPrivateChatWindow(chatHub, id, userName, userEmail, email) {
    var ctrId = 'private_' + id;
    if ($('#' + ctrId).length > 0) return;

    createPrivateChatWindow(chatHub, id, ctrId, userName, userEmail, email);

    chatHub.server.getPrivateMessage(userEmail, email, loadMesgCount).done(function (msg) {
        for (i = 0; i < msg.length; i++) {
            $('#' + ctrId).find('#divMessage').append('<div class="message"><span class="userName">' + msg[i].userName + '</span>: ' + msg[i].message + '</div>');
            // set scrollbar
            scrollTop(ctrId);
        }
    });
}

function createPrivateChatWindow(chatHub, userId, ctrId, userName, userEmail, email) {

    var div = '<div id="' + ctrId + '" class="ui-widget-content draggable" rel="0">' +
                '<div class="header">' +
                    '<div  style="float:right;">' +
                        '<img id="imgDelete"  style="cursor:pointer;" src="/Images/delete.png"/>' +
                    '</div>' +

                    '<span class="selText" rel="0">' + userName + '</span>' +
                    '<span class="selText" id="msgTypeingName" rel="0"></span>' +
                '</div>' +
                '<div id="divMessage" class="messageArea">' +

                '</div>' +
                '<div class="buttonBar">' +
                    '<input id="txtPrivateMessage" class="msgText" type="text"   />' +
                    '<input id="btnSendMessage" class="submitButton button" type="button" value="Send"   />' +
                '</div>' +
                '<div id="scrollLength"></div>' +
            '</div>';

    var $div = $(div);

    // ------------------------------------------------------------------ Scroll Load Data ----------------------------------------------------------------------//

    var scrollLength = 2;
    $div.find('.messageArea').scroll(function () {
        if ($(this).scrollTop() == 0) {
            if ($('#' + ctrId).find('#scrollLength').val() != '') {
                var c = parseInt($('#' + ctrId).find('#scrollLength').val(), 10);
                scrollLength = c + 1;
            }
            $('#' + ctrId).find('#scrollLength').val(scrollLength);
            var count = $('#' + ctrId).find('#scrollLength').val();

            chatHub.server.getScrollingChatData(userEmail, email, loadMesgCount, count).done(function (msg) {
                for (i = 0; i < msg.length; i++) {
                    var firstMsg = $('#' + ctrId).find('#divMessage').find('.message:first');

                    // Where the page is currently:
                    var curOffset = firstMsg.offset().top - $('#' + ctrId).find('#divMessage').scrollTop();

                    // Prepend
                    $('#' + ctrId).find('#divMessage').prepend('<div class="message"><span class="userName">' + msg[i].userName + '</span>: ' + msg[i].message + '</div>');

                    // Offset to previous first message minus original offset/scroll
                    $('#' + ctrId).find('#divMessage').scrollTop(firstMsg.offset().top - curOffset);
                }
            });
        }
    });

    // DELETE BUTTON IMAGE
    $div.find('#imgDelete').click(function () {
        $('#' + ctrId).remove();
    });

    // Send Button event
    $div.find("#btnSendMessage").click(function () {
        $textBox = $div.find("#txtPrivateMessage");
        var msg = $textBox.val();
        if (msg.length > 0) {
            chatHub.server.sendPrivateMessage(userId, msg, 'Click');
            $textBox.val('');
        }
    });

    // Text Box event
    $div.find("#txtPrivateMessage").keyup(function (e) {
        if (e.which == 13) {
            $div.find("#btnSendMessage").click();
        }

        // Typing
        $textBox = $div.find("#txtPrivateMessage");
        var msg = $textBox.val();
        if (msg.length > 0) {
            chatHub.server.sendPrivateMessage(userId, msg, 'Type');
        }
        else {
            chatHub.server.sendPrivateMessage(userId, msg, 'Empty');
        }

        clearInterval(refreshId);
        checkTyping(chatHub, userId, msg, $div, 5000);
    });

    AddDivToContainer($div);
}

function checkTyping(chatHub, userId, msg, $div, time) {
    refreshId = setInterval(function () {
        // Typing
        $textBox = $div.find("#txtPrivateMessage");
        var msg = $textBox.val();
        if (msg.length == 0) {
            chatHub.server.sendPrivateMessage(userId, msg, 'Empty');
        }
    }, time);
}

function AddDivToContainer($div) {
    $('#divContainer').prepend($div);
    $div.draggable({
        handle: ".header",
        stop: function () {
        }
    });
}
// ------------------------------------------------------------------End Private Chat ----------------------------------------------------------------------//