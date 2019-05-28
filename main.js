var ACCESS_TOKEN = "T0PVtNy93bmZYObT4o+WEm8gqbfPnEUXWmJtXLwxU4nAjP1PtUJdlJYo1kI1e1B9pMXyAv83X+ai54hKnoYYZdtlV57fbM4WiWt0jA96Xh1UfuU8t1az6V27J9F41hPoWiV+OAHE7KNGUNELx61idQdB04t89/1O/w1cDnyilFU="

var today = new Date();
var hour = today.getHours();
var minute = today.getMinutes();

var HEAD_ROW = 2;
var HEAD_COLUMN = 2;

var sheet = SpreadsheetApp.getActiveSheet();
var hourRange = sheet.getRange(1, HEAD_COLUMN, 1, 96);
var dateRange = sheet.getRange(HEAD_ROW, 1, 30, 1);

var CLR_DEFAULT  = "#ffffff"
var CLR_SLEEP    = "#9dcce0"
var CLR_GOOUT    = "#b9dd64"
var CLR_MEAL     = "#ff0000"
var CLR_MEDICINE = "#f89d46"

var FLAG_SLEEP = "B101";
var FLAG_GOOUT = "B102";

function doPost(e) {
  var events = JSON.parse(e.postData.contents).events;
  events.forEach(function(event) {
    if (event.type == "message") {
      reply(event);
    }
  });
}

function reply(e) {
  var input = e.message.text;
  var output = "正常に記録しました。"
  
  if (checkDuplicateRecord(input) != ""){
    output = checkDuplicateRecord(input);
    sendReply(e, output);
    return;
  }

  if (input == "食事") {
    recordMeal();
  } else if (input == "服薬") {
    recordMedicine();
  } else if (input == "外出") {
    recordGoOut();
  } else if (input == "帰宅") {
    recordBackHome();
  } else if (input == "就寝") {
    recordGoToBed();
  } else if (input == "起床") {
    recordWakeUp();
  }
  
  output = getStatus();
  
  sendReply(e, output);
}

function sendReply(e, output) {
  var message = {
    "replyToken" : e.replyToken,
    "messages" : [
      {
        "type" : "text",
        "text" : output
      }
    ]
  };
  var replyData = {
    "method" : "post",
    "headers" : {
      "Content-Type" : "application/json",
      "Authorization" : "Bearer " + ACCESS_TOKEN
    },
    "payload" : JSON.stringify(message)
  };
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", replyData);
}

function getStatus() {
  var status = "【現在の状態】\n";
  status = isSleeping() ? status + "睡眠中\n" : status + "起床\n";
  status = isGoingOut() ? status + "外出中" : status + "在宅";
  
  return status;
}

function recordMeal() {
  colorBackground(CLR_MEAL)
}

function recordMedicine() {
  colorBackground(CLR_MEDICINE)
}

function recordGoOut() {
  sheet.getRange(FLAG_GOOUT).setValue(1)
  colorBackground(CLR_GOOUT)
}

function recordBackHome() {
  sheet.getRange(FLAG_GOOUT).setValue(0)
  
  // 外出の間を染める処理
  colorBackgroundToNow(CLR_GOOUT)
}

function recordGoToBed() {
  sheet.getRange(FLAG_SLEEP).setValue(1)
  colorBackground(CLR_SLEEP)
}

function recordWakeUp() {
  sheet.getRange(FLAG_SLEEP).setValue(0)

  // 睡眠の間を染める処理
  colorBackgroundToNow(CLR_SLEEP)
}

function colorBackgroundToNow(colorScale) {
  var endColumn = HEAD_COLUMN + 95;
  var hasFound = false;
  var rowOfToday = getTargetDayRow(today);
  var columnOfNow = getTargetHourColumn(today);
  
  for (var i = columnOfNow; i > 1; i--) {
    if (sheet.getRange(rowOfToday, i, 1, 1).getBackground() == CLR_DEFAULT) {
      sheet.getRange(rowOfToday, i, 1, 1).setBackground(colorScale);
    } else if (sheet.getRange(rowOfToday, i, 1, 1).getBackground() == CLR_MEAL
            || sheet.getRange(rowOfToday, i, 1, 1).getBackground() == CLR_MEDICINE) {
      continue;
    } else if (sheet.getRange(rowOfToday, i, 1, 1).getBackground() == colorScale) {
      hasFound = true;
      break;
    }
  }
  
  if (hasFound == false) {
    // 記録開始が見つからなければ前日にさかのぼって色付け
    for (var i = endColumn; i > 1; i--) {
      if (sheet.getRange(rowOfToday - 1, i, 1, 1).getBackground() == CLR_DEFAULT) {
        sheet.getRange(rowOfToday - 1, i, 1, 1).setBackground(colorScale);
      } else if (sheet.getRange(rowOfToday - 1, i, 1, 1).getBackground() == CLR_MEAL
              || sheet.getRange(rowOfToday - 1, i, 1, 1).getBackground() == CLR_MEDICINE) {
        continue;
      } else if (sheet.getRange(rowOfToday - 1, i, 1, 1).getBackground() == colorScale) {
        break;
      }
    }
  }
}

function getTargetDayRow(targetDate) {
  var i = HEAD_ROW - 11;
    
  dateRange.getValues().forEach(function(date) {
    if (new Date(date).getDate() == targetDate.getDate()) {
      return;
    }
    i += 1;
  });
  
  return i;
}

function getTargetHourColumn(targetDate) {
  var j = HEAD_COLUMN;
  var hasFound = false;
  
  hourRange.getValues()[0].forEach(function(eachHour) {
    if (hasFound == true) return;
    
    if (eachHour == targetDate.getHours()) {
      if (0 <= targetDate.getMinutes() && targetDate.getMinutes() < 15) {
        hasFound = true;
        return;
      } else if (15 <= targetDate.getMinutes() && targetDate.getMinutes() < 30){
        j += 1;
        hasFound = true;
        return;
      } else if (30 <= targetDate.getMinutes() && targetDate.getMinutes() < 45) {
        j += 2;
        hasFound = true;
        return;
      } else {
        j += 3;
        hasFound = true;
        return;
      }
    }
    j += 1;
  });
  
  return j;
}

function colorBackground(colorScale) {
  var rowOfToday = getTargetDayRow(today);
  var columnOfNow = getTargetHourColumn(today);
  
  sheet.getRange(rowOfToday, columnOfNow, 1, 1).setBackground(colorScale);
}

function isSleeping () {
  return sheet.getRange(FLAG_SLEEP).getValue()
}

function isGoingOut () {
  return sheet.getRange(FLAG_GOOUT).getValue()
}

function checkDuplicateRecord(input) {
  if (input == "就寝" && isSleeping() == true) {
    return "既に就寝中です。"
  } else if (input == "起床" && isSleeping() == false) {
    return "既に起床済みです。"
  } else if (input == "外出" && isGoingOut() == true) {
    return "既に外出中です。"
  } else if (input == "帰宅" && isGoingOut() == false) {
    return "既に帰宅済みです。"
  }
  
  return ""
}