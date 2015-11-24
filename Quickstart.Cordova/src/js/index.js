import DeviceManager from './lib/device-manager';
import Store from './lib/storage-manager';

var app = new DeviceManager();

/**
 * Find the parent node of a given name
 * @param {string} name the name we are searching for
 * @param {Node} el the current el
 */
function findParentNode(name, el) {
   if (el.localName.toLowerCase() === 'body') {
       return undefined;
   } 
   if (el.localName.toLowerCase() === name) {
       return el;
   }
   return findParentNode(name, el.parentNode);
}

app.on('deviceready', function () {
    var taskStore = new Store();
    
    // Get the various pieces of the UX so they can be referred to later
    var el = {
        todoitems: document.querySelector('#todo-items'),
        summary: document.querySelector('#summary'),
        refreshicon: document.querySelector('#refresh-icon'),
        addnewtask: document.querySelector('#add-new-task'),
        newitemtextbox: document.querySelector('#new-item-text')
    };
    
    function setRefreshIcon(loading) {
        if (loading) {
            el.refreshicon.className = 'fa fa-refresh fa-spin';
        } else {
            el.refreshicon.className = 'fa fa-refresh';
        }

    }
    
    // This is called whenever we want to refresh the contents from the database
    function refreshTaskList() {
        setRefreshIcon(true);

        taskStore.read({ complete: false }).then((todoItems) => {
            let count = 0;
            el.todoitems.innerHTML = ''; 
            todoItems.forEach((entry, index) => {
                let checked = entry.complete ? ' checked="checked"': '';
                let entrytext = entry.text.replace('"', '&quot;');
                let html = `<li data-todoitem-id="${entry.id}"><input type="checkbox" class="item-complete"${checked}><div><input class="item-text" value="${entrytext}"></div></li>`;
                el.todoitems.innerHTML += html;
                count++;
            });  
            el.summary.innerHTML = `<strong>${count}</strong> item(s)`;  
            setRefreshIcon(false);
        }).catch((error) => {
            console.error('Error reading task store: ', error);
            el.summary.innerHTML = '<strong>Error reading store.</strong>';
            setRefreshIcon(false);
        });
    }
    
    // Set up the event handler for clicking on Refresh Tasks
    el.refreshicon.addEventListener('click', refreshTaskList);
    refreshTaskList();
    el.newitemtextbox.focus();
    
    // Set up the event handler for clicking on Add New Task
    el.addnewtask.addEventListener('click', function (event) {
        let itemText = el.newitemtextbox.value;
        if (itemText !== '') {
            taskStore.insert({ text: itemText, complete: false }).then(refreshTaskList);
        }
        el.newitemtextbox.value = '';
        el.newitemtextbox.focus();
        event.preventDefault();
    });
    
    // Set up the event handler for updating a task
    el.todoitems.addEventListener('change', function (event) {
        let target = event.target;
        // Only handle change events on the item-text or item-complete elements
        if (target.className === 'item-text' || target.className === 'item-complete') {
            // Get the LI node above the current node
            let li = findParentNode('li', target);
            if (!li) {
                console.log('Could not find LI - break');
                return;
            }            
            // The ID is the data-todoitem-id attribute value
            let id = li.getAttribute('data-todoitem-id');
            
            // Pull the original record
            taskStore.getById(id).then((element) => {
                // Replace the complete or text field from the event
                if (target.className === 'item-text') {
                    element.text = target.value.trim();
                } else if (target.className === 'item-complete') {
                    element.complete = target.checked;
                }                
                // Update the record with the new information
                return taskStore.update(element);
            })
            .then((element) => {
                refreshTaskList();
            });
            event.preventDefault();
        }
    });
});
