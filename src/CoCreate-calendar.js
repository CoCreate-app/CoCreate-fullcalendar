var calOBJs = [];
var calendarElClass = 'cal-container';
var randomColors = ['#09efc6', '#09ef1a', '#efec09', '#ef8609', '#ef6009', '#b609ef', '#ef0986', '#09efec', '#ecef09', '#09a6ef', '#076692',  '#c0b507', '#c04807', '#6b07c0', '#72aeb5', '#69811e', '#8d2b23'];


function initSocketsForCalendars() {

    CoCreateSocket.listen('updateDocument', function(data) {
      updateCalendar(data);
    })
    
    CoCreateSocket.listen('deleteDocument', function (data) {
      deleteDocumentForCalendar(data);
    })
    
    CoCreateSocket.listen('readDocumentList', function(data) {
      fetchedCalendarData(data);
    })
}


function fetchedCalendarData(data) {
  
  let calObject = g_cocreateFilter.getObjectByFilterId(calOBJs, data['element']);
  if (calObject) {
    renderDataToCalendar(calObject, data)
  }
}


///////////////////////////////////////////////////////////////////////
function initCalendars(container) {

  let process_container = container || document;
  if (!process_container.querySelectorAll) {
    return;
  }
  let calContainers = process_container.querySelectorAll('.' + calendarElClass);
  
  if (calContainers.length == 0 &&  process_container != document && process_container.hasAttribute(calendarElClass)) {
    calContainers = [process_container];
  } 
  
  
  for (var i=0; i < calContainers.length; i++) {
    var calContainer = calContainers[i];
    
    var id = calContainer.id;
    if (!id) continue;
    
    var cal_id = calContainer.getAttribute('data-calendar_id');
    
    var displayName = calContainer.getAttribute('data-dispaly_field');
    
    let filter = g_cocreateFilter.setFilter(calContainer, "data-calendar_id", "calendar");
    if (!filter) continue;
    
    if (CoCreateUtils.getInitialized(calContainer)) {
			continue;
		}
		CoCreateUtils.setInitialized(calContainer)
		
    
    var calendar = new FullCalendar.Calendar(calContainer, {
      plugins: [ 'interaction', 'dayGrid', 'timeGrid', 'resourceTimeline', 'timeline', 'list' ],
      editable: true,
      eventResizableFromStart: true, 
      eventLimit: true,
      selectable: true,
      selectMirror: true,
      height: 'parent',
      nowIndicator: true,
      selectMinDistance: 100,
      header: {
        left: 'prev,',
        center: 'title',
        right: 'next'
      },
      defaultView: 'dayGridMonth',
      
      // eventRender: function(event, element, view) {
      //   return $(event.el);
      // },
      
      eventClick: function(info) {
        eventClicked(info);
      },
      
      eventResize: function(info) {
        changedEvent(info);
      },
      
      eventDrop: function(info) {
        changedEvent(info);
      },
      
      select: function (info) {
        selectedDates(info);
      }
    });
    
    calendar.render();
    
    var calObj = {
      eId: id,
      calendar_id: cal_id,
      calendar: calendar,
      displayName: displayName,
      filter: filter
    }
    
    calContainer.addEventListener("changeFilterInput", function(e) {
      // removeOldData(eObj.el)
      //. calenar init
      eObj.filter.startIndex = 0;
      g_cocreateFilter.fetchData(eObj.filter);
    })
    
    g_cocreateFilter.fetchData(filter);

    calOBJs.push(calObj);
  }

}

function renderDataToCalendar(calObj, data) {
  console.log(data);
  var eventSource = new Array();
  
  data['data'].forEach(function(item, index) {
    var newEvent = new Object();
    newEvent.id = item['_id'];
    newEvent.title = getTitle(item, calObj.displayName);
    
    newEvent.textColor = 'black';
    newEvent.backgroundColor = getRandomColor();
    
    //var date = getDate(item);
    
    newEvent.start = item.start_date;
    newEvent.end = item.end_date;
    
    if (item.start_time) newEvent.start+= 'T' + item.start_time;
    if (item.end_time) newEvent.end+= 'T' + item.end_time;
    
    if (item.start_date && item.end_date) eventSource.push(newEvent);
  })
  
  calObj.calendar.addEventSource(eventSource);
}

function getRandomColor() {
  var number = Math.floor(Math.random() * randomColors.length);
  return randomColors[number % (randomColors.length)];
}

function getTitle(doc, displayName) {
  var title = '';
  
  if (doc[displayName] && displayName) {
    title = doc[displayName];
  }
  
  return title;
  
}

function getDate(doc) {
  var startDate, endDate;
  //var startDate = '2019-08-05', endDate = '2019-08-09';
  
  if (doc.inputs) {
    for (var i=0; i < doc.inputs.length; i++) {
      var input = doc.inputs[i];
      if (input.name == 'start_date') {
        startDate = input['value'];
      } else if (input.name == 'end_date') {
        endDate = input['value'];
      }
    }
  }
  
  return {
    startDate: startDate,
    endDate: endDate
  }
}

function updateCalendar(data) {
  var collection = data['collection'];
  
  for (var i=0; i<calOBJs.length; i++) {
    var calObj = calOBJs[i];
    
    if (calObj.filter.collection ==  collection) {
      var calendar = calObj.calendar;
      var eventSource = [];
      
      var event = calendar.getEventById(data['document_id']);
      if (event) {

        var start = event.start;
        var end = event.end;
        var start_date = getDateString(start);
        var start_time = getTimeString(start);
        var end_date = getDateString(end);
        var end_time = getTimeString(end);
      
        var backgroundColor = event.backgroundColor;
        var textColor = event.textColor;
        const main_data = data['data'];
        for (var key in main_data) {
          
          if (key ==  calObj.displayName) {
            var newTitle = main_data[key];
            event.setProp('title', newTitle);
          }
          
          if (key ==  'start_date') {
            start_date = main_data[key];
          } 
          
          if (key ==  'end_date') {
            end_date = main_data[key];
          }
          
          if (key == 'start_time') {
            start_time = main_data[key];
          }
          
          if (key == 'end_time') {
            end_time = main_data[key];
          }
        }
        
        event.setStart(start_date + 'T' + start_time);
        event.setEnd(end_date + 'T' + end_time);
      } else {
        let newEvent = createEventItem(data['data'], calObj.displayName);
        if (newEvent) {
          eventSource.push(newEvent)
          calendar.addEventSource(eventSource);
        }
        
      }
    }
  }
}

function createEventItem(data, displayName) {
  var newEvent = new Object();
  newEvent.id = data['_id'];
  newEvent.title = getTitle(data, displayName);
  newEvent.textColor = 'black';
  newEvent.backgroundColor = getRandomColor();
  newEvent.start = data.start_date;
  newEvent.end = data.end_date;
  if (data.start_time) newEvent.start+= 'T' + data.start_time;
  if (data.end_time) newEvent.end+= 'T' + data.end_time;
  
  if (!data.start_date || !data.end_date) {
    return null;
  }  
  return newEvent;
}



function deleteDocumentForCalendar(data) {
  const document_id = data['document_id']
  for (var i = 0; i < calOBJs.length; i++) {
    var calObj = calOBJs[i];
    
    if (calObj.filter.collection == data['collection']) {
      removeEvent(calObj.calendar, document_id);
    }
  }
}

function removeEvent(calendar, id) {
  var eventSource = calendar.getEventById(id);
  eventSource.remove();
}

function eventClicked(info) {
  console.log(info);
  var event = info.event;
  var eventId = event.id;
  
  var calendar = event._calendar;
  var cal_el = calendar.el;

  var eventLink = cal_el.querySelector('.eventLink');
  
  eventLink.setAttribute('data-pass_document_id', eventId);
  CoCreateLogic.initDataPassValues();
  CoCreateLogic.setLinkProcess(eventLink);
}

function changedEvent(info) {
  
  var event = info.event;
  var startDate = getDateString(event.start);
  var endDate = getDateString(event.end);
  
  var startTime = getTimeString(event.start);
  var endTime = getTimeString(event.end);

  console.log(startDate, endDate);
  
  console.log(info);
  
  var cal_id = event._calendar.el.id
  var calObj = getCalObjById(cal_id);
  if (calObj) {

    CoCreate.updateDocument({
      'collection' : calObj.filter.collection,
      'element' : cal_id,
      'metadata': "",
      'document_id': event.id,
      'data' : {
        start_date  : startDate,
        end_date    : endDate,
        start_time  : startTime,
        end_time    : endTime
      }
    })
  }
}

function getDateString(date) {
  var year = date.getFullYear();
  var month = date.getMonth()+1;
  var dt = date.getDate();
  
  if (dt < 10) {
    dt = '0' + dt;
  }
  if (month < 10) {
    month = '0' + month;
  }

  return year+'-' + month + '-'+dt;
}

function getTimeString(date) {
  
  var hour = date.getHours();
  var min = date.getMinutes();
  
  if (hour < 10) {
    hour = '0' + hour;
  }
  if (min < 10) {
    min = '0' + min;
  }
  
  return hour + ':' + min;
}

function getCalObjById(id) {
  
  
  for (var i=0; i<calOBJs.length; i++) {
    var calObj = calOBJs[i];
    
    if (id == calObj.eId) return calObj;
  }
  
  return null;
}

function selectedDates(info) {
  var startDate = getDateString(info.start);
  var endDate = getDateString(info.end);
  
  var startTime = getTimeString(info.start);
  var endTime = getTimeString(info.end);
  
  var cal_id = info.view.calendar.el.id
  var calObj = getCalObjById(cal_id);
  if (calObj) {
    
    const eventLink = info.view.calendar.el.querySelector('.eventLink');
    
    eventLink.setAttribute('data-pass_document_id', "");
    CoCreateLogic.setDataPassValues({
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime
    });
  
    CoCreateLogic.setLinkProcess(eventLink);
  }
}

function initCalendarButtons(container) {
  let main_container = container || document;
  if (!main_container.querySelectorAll) {
    return
  }
  var btns = main_container.querySelectorAll('[data-calendar_id][data-btn_type]');
  if (btns.length === 0 && 
    main_container != document && 
    main_container.hasAttribute('data-btn_type') && 
    main_container.hasAttribute('data-calendar_id')) 
    {
      btns = [main_container];
    }

  for (var i=0; i < btns.length; i++) {
    var btn = btns[i];
    
    if (CoCreateUtils.getInitialized(btn)) {
      continue;
    }
    CoCreateUtils.setInitialized(btn);
    
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      var type = this.getAttribute('data-btn_type');
      var calId = this.getAttribute('data-calendar_id');
      
      calendarBtnClicked(calId, type);
    })
  }
}

function calendarBtnClicked(calId, type) {
  if (!calId) return;
  
  for (var i=0; i<calOBJs.length; i++) {
    var calObj = calOBJs[i];
    
    if (calObj.eId == calId) {
      var calendar = calObj.calendar;
      
      console.log(type);
      
      switch (type) {
        case 'dayGridDay':
          // code
          calendar.changeView( 'dayGridDay' )          ////   dayGridDay
          break;
        case 'dayGridWeek':
          // code
          calendar.changeView( 'dayGridWeek' )          ////  dayGridWeek
          break;
        case 'dayGridMonth':
          // code
          calendar.changeView( 'dayGridMonth' )     ///   dayGridMonth
          break;
        case 'resourceTimelineDay':
          // code
          calendar.changeView( 'resourceTimelineDay' )     ///   resourceTimelineDay
          break;
        case 'resourceTimelineThreeDays':
          // code
          calendar.changeView( 'resourceTimelineThreeDays' )     ///   resourceTimelineThreeDays
          break;
        case 'resourceTimelineFiveDays':
          // code
          calendar.changeView( 'resourceTimelineFiveDays' )     ///   resourceTimelineFiveDays
          break;
        case 'timeGridWeek':
          // code
          calendar.changeView( 'timeGridWeek' )     ///   timeGridWeek
          break;
        case 'timeGridDay':
          // code
          calendar.changeView( 'timeGridDay' )     ///   timeGridDay
          break;
        case 'listDay':
          // code
          calendar.changeView( 'listDay' )     ///   listDay
          break;
        case 'listWeek':
          // code
          calendar.changeView( 'listWeek' )     ///   listWeek
          break;
        case 'listMonth':
          // code
          calendar.changeView( 'listMonth' )     ///   listMonth
          break;
        case 'listYear':
          // code
          calendar.changeView( 'listYear' )     ///   listYear
          break;
        case 'timelineWeek':
          // code
          calendar.changeView( 'timelineWeek' )     ///   timelineWeek
          break;
        case 'today':
          // code
          calendar.today();     ///   today
          break;
        default:
            // code
      }
    }
  }
}

/** init **/
initSocketsForCalendars();
initCalendars();
initCalendarButtons();

CoCreateInit.register('CoCreateCalendar', window, initCalendars);
CoCreateInit.register('CoCreateCalendar_btn', window, initCalendarButtons)