import Observer from '@cocreate/observer'
import link from '@cocreate/link';
import localStorage from '@cocreate/local-storage';
import { getValueFromObject, queryElements } from '@cocreate/utils';

const calendars = new Map();
const selector = '[plugin="fullcalendar"]';
const bgColors = ['#09efc6', '#09ef1a', '#efec09', '#ef8609', '#ef6009', '#b609ef', '#ef0986', '#09efec', '#ecef09', '#09a6ef', '#076692', '#c0b507', '#c04807', '#6b07c0', '#72aeb5', '#69811e', '#8d2b23'];
const textColors = ['#8c489f', '#f610e5', '#1013f6', '#1079f6', '#109ff6', '#49f610', '#10f679', '#f61013', '#1310f6', '#f65910', '#f8996c', '#3f4af8', '#3fb7f8', '#94f83f', '#8d514a', '#fff', '#72d4dc'];


function init(element) {
    if (element && !Array.isArray(element))
        element = [element]
    else if (!element)
        element = document.querySelectorAll(selector);

    for (let i = 0; i < element.length; i++) {
        element[i].setValue = (data) => setData(element[i], data)
        if (element[i].getValue) {
            let value = element[i].getValue()
            if (value)
                element[i].setValue(value)
        }
        // element[i].getValue = () => getData(data)

    }


    for (let i = 0; i < element.length; i++) {
        let displayName = element[i].getAttribute('event-name');

        let calendar = new FullCalendar.Calendar(element[i], {
            plugins: ['interaction', 'dayGrid', 'timeGrid', 'resourceTimeline', 'timeline', 'list'],
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

            eventClick: function (data) {
                eventClicked(data);
            },

            eventResize: function (data) {
                data.event.el.save()
            },

            eventDrop: function (data) {
                data.event.el.save()
            },

            select: function (data) {
                selectedDates(data);
            }
        });

        calendar.displayName = displayName
        calendar.render();

        calendars.set(element[i], calendar);
    }
}

function setData(element, data) {
    const calendar = calendars.get(element);
    if (!calendar)
        return

    const eventSource = [];

    for (let object of data.objects) {
        let event = calendar.getEventById(object._id);
        if (event) {
            if (data.filter && data.filter.remove) {
                event.remove();
                continue
            }

            if (object.displayName)
                event.setProp('title', object.displayName);

            if (object.allDay)
                event.setAllDay(object.allDay);

            if (object.startDate || object.startTime) {
                let startDate, startTime
                if (!object.startDate)
                    startDate = getDateString(event.start);
                if (!object.startTime)
                    startTime = getTimeString(event.start);
                event.setStart(startDate + 'T' + startTime);
            }

            if (object.endDate || object.endTime) {
                let endDate, endTime
                if (!object.startDate)
                    startDate = getDateString(event.end);
                if (!object.startTime)
                    endTime = getTimeString(event.end);

                endDate = convertEndDateForRender(endDate, endTime, event.allDay);
                event.setEnd(endDate + 'T' + endTime);
            }
        } else {
            event = {};
            const { bgColor, textColor } = getRandomColor()

            event.id = object['_id'];
            event.title = getValueFromObject(data, calendar.displayName)

            event.textColor = textColor;
            event.backgroundColor = bgColor;

            event.start = object.startDate;
            event.end = convertEndDateForRender(object.endDate, object.endTime, object.allDay);
            event.allDay = object.allDay;

            if (object.startTime)
                event.start += 'T' + object.startTime;
            if (object.endTime)
                event.end += 'T' + object.endTime;
            if (object.startDate && object.endDate)
                eventSource.push(event);
        }
    }

    calendar.addEventSource(eventSource);
}

function getData(event) {
    return {
        start: event.start,
        end: event.end,
        startDate: getDateString(event.start),
        endDate: getDateString(event.end),
        startTime: getTimeString(event.start),
        endTime: getTimeString(event.end),
        allDay: getTimeString(event.allDay)
    }
}

function convertEndDateForRender(end, endTime, allDay) {
    if (!allDay) {
        return end;
    }
    return end;
    let endDate = new Date(end);
    endDate.setDate(endDate.getDate() + 1);
    return endDate.toISOString().split('T')[0]
}

function getRandomColor() {
    const number = Math.floor(Math.random() * bgColors.length);
    return { bgColor: bgColors[number], textColor: textColors[number] };
}

function removeEvent(element) {
    const event = calendar.getEventById(object._id);
    event.remove();
}

function eventClicked(data) {
    console.log(data);
    const event = data.event;
    const eventId = event.id;
    const calendar = event._calendar;

    let eventLink = calendar.el.querySelector('.eventLink');
    if (eventLink.hasAttribute('pass-object')) {
        eventLink.setAttribute('pass-object', eventId);
    }

    let els = eventLink.querySelectorAll("[pass-object]")

    els.forEach((el) => {
        if (!el.getAttribute('pass-object')) {
            el.setAttribute('pass-object', eventId);
        }
    })

    link.runLink(eventLink);
}

// TODO: observe or someother means of adding functions to event element
function eventAdded(element) {
    element.getValue = () => getData(data)
}

function getDateString(date) {
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var dt = date.getDate();

    if (dt < 10) {
        dt = '0' + dt;
    }
    if (month < 10) {
        month = '0' + month;
    }

    return year + '-' + month + '-' + dt;
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

function selectedDates(data) {
    var startDate = getDateString(data.start);
    var endDate = getDateString(data.end);

    var startTime = getTimeString(data.start);
    var endTime = getTimeString(data.end);

    var element = data.view.calendar.el
    var calendar = calendars.get(element);
    if (calendar) return

    const eventLink = data.view.calendar.el.querySelector('.eventLink');
    if (eventLink.hasAttribute('pass-object')) {
        eventLink.setAttribute('pass-object', "");
    }
    let els = eventLink.querySelectorAll("[pass-object]")

    els.forEach((el) => {
        if (!el.getAttribute('pass-object')) {
            el.setAttribute('pass-object', "");
        }
    })

    let passAttributes = [
        {
            pass_value_to: 'startDate',
            value: startDate
        },
        {
            pass_value_to: 'endDate',
            value: endDate
        },
        {
            pass_value_to: 'startTime',
            value: startTime
        },
        {
            pass_value_to: 'endTime',
            value: endTime
        }
    ]

    localStorage.setItem('passedValues', JSON.stringify(passAttributes));


    link.runLink(eventLink);
}

function initButton(element) {
    if (element && !Array.isArray(element))
        element = [element]
    else if (!element)
        element = document.querySelectorAll('[calendar-view]');

    for (let i = 0; i < element.length; i++) {
        element.addEventListener('click', function (e) {
            e.preventDefault();
            const type = element.getAttribute('calendar-view');
            const calendar = queryElements({ element, prefix: 'calendar' })
            // TODO: use selector to query calendars
            calendarBtnClicked(calendar, type);
        })
    }
}

function calendarBtnClicked(calendar, type) {
    for (let i = 0; i < calendar.length; i++) {
        // types: dayGridDay, dayGridWeek, dayGridMonth, resourceTimelineDay, resourceTimelineThreeDays, resourceTimelineFiveDays, timeGridWeek, timeGridDay, listDay, listWeek, listMonth, listYear, timelineWeek
        if (type === 'today')
            calendar[i].today();
        else
            calendar[i].changeView(type);
    }
}

init();
initButton();

Observer.init({
    name: 'CoCreateCalendar',
    observe: ['addedNodes'],
    target: selector,
    callback: function (mutation) {
        init(mutation.target)
    }
})


Observer.init({
    name: 'CoCreateCalendarBtn',
    observe: ['addedNodes'],
    target: '[calendar-view]',
    callback: function (mutation) {
        initButton(mutation.target)
    }
})