using System;
using System.Collections.Generic;
using System.Threading.Tasks;

// This file includes non-await code for an async interface
// it will execute synchronously - we are ok with that right
// now as the whole system will be replaced with an async
// version later on
#pragma warning disable 1998
namespace QuickStart.UWP.Models
{
    /// <summary>
    /// Implementation of the TaskStore - this is a basic
    /// CRUD type store.
    /// </summary>
    class TaskStore
    {
        private List<TaskItem> _items;

        public TaskStore()
        {
            _items = new List<TaskItem>();

            _items.Add(new TaskItem { Id = "0", Title = "Task 1" });
            _items.Add(new TaskItem { Id = "1", Title = "Task 2" });
        }

        public async Task CreateTaskItem(TaskItem item)
        {
            item.Id = Guid.NewGuid().ToString();
            _items.Add(item);
        }

        public async Task<TaskItem> RetrieveTaskItem(string itemID)
        {
            return _items.Find(t => t.Id.Equals(itemID));
        }

        public async Task UpdateTaskItem(TaskItem item)
        {
            var idx = _items.FindIndex(t => t.Id.Equals(item.Id));
            if (idx >= 0)
            {
                _items[idx] = item;
            }
        }

        public async Task DeleteTaskItem(TaskItem item)
        {
            var idx = _items.FindIndex(t => t.Id.Equals(item.Id));
            if (idx >= 0)
            {
                _items.RemoveAt(idx);
            }
        }

        public async Task<ICollection<TaskItem>> RetrieveTaskItems()
        {
            return _items;
        }
    }
}
