import crud from '@cocreate/crud-client';
import ccfilter from '@cocreate/filter'
import observer from '@cocreate/observer'
import logic from '@cocreate/logic';

var calOBJs = new Map();
var calendarElClass = 'cal-container';
const bgColors =  ['#09efc6', '#09ef1a', '#efec09', '#ef8609', '#ef6009', '#b609ef', '#ef0986', '#09efec', '#ecef09', '#09a6ef', '#076692',  '#c0b507', '#c04807', '#6b07c0', '#72aeb5', '#69811e', '#8d2b23'];
const textColors =    ['#8c489f', '#f610e5', '#1013f6', '#1079f6', '#109ff6', '#49f610', '#10f679', '#f61013', '#1310f6', '#f65910', '#f8996c',  '#3f4af8', '#3fb7f8', '#94f83f', '#8d514a', '#fff', '#72d4dc'];


function initSocketsForCalendars() {

    crud.listen('createDocument', function(data) {
      updateCalendar(data);
    });
    
    crud.listen('updateDocument', function(data) {
      updateCalendar(data);
    });
    
    crud.listen('deleteDocument', function (data) {
      deleteDocumentForCalendar(data);
    });
    
    crud.listen('readDocumentList', function(data) {
      fetchedCalendarData(data);
    });
}


function fetchedCalendarData(data) {
  
  let calObject = calOBJs.get(data['element']);
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
    
    var cal_id = calContainer.getAttribute('calendar_id');
    
    var displayName = calContainer.getAttribute('event-name');
    
    let filter = ccfilter.setFilter(calContainer, "calendar_id", "calendar");
    if (!filter) continue;
    
    if (observer.getInitialized(calContainer)) {
			continue;
		}
		observer.setInitialized(calContainer)
		
    
    var calendar = new FullCalendar.Calendar(calContainer, {
      plugins: [ 'interaction', 'dayGrid', 'timeGrid', 'resourceTimeline', 'timeline', 'list' ],
      height: '100%',
      editable: true,
      timeZone: 'local',
      eventResizableFromStart: true, 
      eventLimit: true,
      selectable: true,
      selectMirror: true,
      // contentHeight: 1200,
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
      calObj.filter.startIndex = 0;
      ccfilter.fetchData(calObj.filter);
    })
    
    ccfilter.fetchData(filter);

    calOBJs.set(calObj);
  }

}

function renderDataToCalendar(calObj, data) {
  var eventSource = new Array();
  
  data['data'].forEach(function(item, index) {
    var newEvent = {};
    const {bg_color, text_color} = getRandomColor()
    newEvent.id = item['_id'];
    newEvent.title = getTitle(item, calObj.displayName);
    
    newEvent.textColor = text_color;
    newEvent.backgroundColor = bg_color;

    newEvent.start = item.start_date;
    newEvent.end = convertEndDateForRender(item.end_date, item.end_time, item.allDay);
    newEvent.allDay = item.allDay;
    if (item.start_time) newEvent.start+= 'T' + item.start_time;
    if (item.end_time) newEvent.end+= 'T' + item.end_time; 
    
    if (item.start_date && item.end_date) eventSource.push(newEvent);
  })
  
  calObj.calendar.addEventSource(eventSource);
}

function getRandomColor() {
  var number = Math.floor(Math.random() * bgColors.length);
  return {bg_color: bgColors[number], text_color: textColors[number]};
}

function getTitle(doc, displayName) {
  var title = '';
  
  if (doc[displayName] && displayName) {
    title = doc[displayName];
  }
  
  return title;
  
}

function updateCalendar(data) {
  var collection = data['collection'];
  
  for (let calObj of calOBJs.values()) {
    
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
        var allDay = event.allDay;
      
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
          
          if (key === 'allDay') {
            allDay = main_data[key]
          }
        }
        
        end_date = convertEndDateForRender(end_date, end_time, allDay);
        event.setAllDay(allDay);
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
  const {bg_color, text_color} = getRandomColor()
  newEvent.id = data['_id'];
  newEvent.title = getTitle(data, displayName);
  newEvent.textColor = 'black';
  newEvent.backgroundColor = bg_color;
  newEvent.textColor = text_color;
  newEvent.start = data.start_date;
  newEvent.end = convertEndDateForRender(data.end_date, data.end_time, data.allDay);
  newEvent.allDay = data.allDay;
  if (data.start_time) newEvent.start+= 'T' + data.start_time;
  if (data.end_time) newEvent.end+= 'T' + data.end_time;
  
  if (!data.start_date || !data.end_date) {
    return null;
  }  
  return newEvent;
}



function deleteDocumentForCalendar(data) {
  const document_id = data['document_id']
  for (let calObj of calOBJs.values()) {
    
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
  if (eventLink.hasAttribute('pass-document_id')) {
      eventLink.setAttribute('pass-document_id', eventId);
  }  
  
  let els = eventLink.querySelectorAll("[pass-document_id]")
  
  els.forEach((el) => {
    if (!el.getAttribute('pass-document_id')) {
      el.setAttribute('pass-document_id', eventId);
    }
  })

  // logic.initDataPassValues();
  logic.runLink(eventLink);
  
}

function changedEvent(info) {
  
  var event = info.event;
  var startDate = getDateString(event.start);
  var endDate = getDateString(event.end);
  
  var startTime = getTimeString(event.start);
  var endTime = getTimeString(event.end);

  var cal_id = event._calendar.el.id
  var calObj = calOBJs.get(cal_id);
  if (calObj) {

    crud.updateDocument({
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

function selectedDates(info) {
  var startDate = getDateString(info.start);
  var endDate = getDateString(info.end);
  
  var startTime = getTimeString(info.start);
  var endTime = getTimeString(info.end);
  
  var cal_id = info.view.calendar.el.id
  var calObj = calOBJs.get(cal_id);
  if (calObj) {
    
    const eventLink = info.view.calendar.el.querySelector('.eventLink');
    if (eventLink.hasAttribute('pass-document_id')) {
      eventLink.setAttribute('pass-document_id', "");
    }    
    let els = eventLink.querySelectorAll("[pass-document_id]")
  
    els.forEach((el) => {
      if (!el.getAttribute('pass-document_id')) {
        el.setAttribute('pass-document_id', "");
      }
    })

    let passValues = [
      {
    			pass_value_to: 'start_date',
					value: startDate
      },
      {
    			pass_value_to: 'end_date',
					value: endDate
      },
      {
    			pass_value_to: 'start_time',
					value: startTime
      },
      {
    			pass_value_to: 'end_time',
					value: endTime
      }
    ]
    
    window.localStorage.setItem('passedValues', JSON.stringify(passValues));

    
    // logic.setDataPassValues({
    //   start_date: startDate,
    //   end_date: endDate,
    //   start_time: startTime,
    //   end_time: endTime
    // });
  
    logic.runLink(eventLink);
  }
}

function initCalendarButtons(container) {
  let main_container = container || document;
  if (!main_container.querySelectorAll) {
    return
  }
  var btns = main_container.querySelectorAll('[calendar_id][calendar-view]');
  if (btns.length === 0 && 
    main_container != document && 
    main_container.hasAttribute('calendar-view') && 
    main_container.hasAttribute('calendar_id')) 
    {
      btns = [main_container];
    }

  for (var i=0; i < btns.length; i++) {
    var btn = btns[i];
    
    // if (observer.getInitialized(btn)) {
    //   continue;
    // }
    // observer.setInitialized(btn);
    
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      var type = this.getAttribute('calendar-view');
      var calId = this.getAttribute('calendar_id');
      
      calendarBtnClicked(calId, type);
    })
  }
}

function convertEndDateForRender(end, end_time, allDay)
{
  if (!allDay) {
    return end;
  }
  return end;
  let endDate = new Date(end);
  endDate.setDate(endDate.getDate() + 1);
  return endDate.toISOString().split('T')[0]
}

function calendarBtnClicked(calId, type) {
  if (!calId) return;
  
  for (let calObj of calOBJs.values()) {

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

// observer.register('CoCreateCalendar', window, initCalendars);
CoCreate.observer.init({
	name: 'CoCreateCalendar', 
	observe: ['addedNodes'],
	include: '[calendar_id]', 
	callback: function(mutation) {
		initCalendars(mutation.target)
	}
})

// observer.register('CoCreateCalendar_btn', window, initCalendarButtons)
CoCreate.observer.init({
	name: 'CoCreateCalendarBtn', 
	observe: ['addedNodes'],
	include: '[calendar_id][calendar-view]', 
	callback: function(mutation) {
		initCalendarButtons(mutation.target)
	}
})