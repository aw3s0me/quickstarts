using Microsoft.WindowsAzure.MobileServices;
using System;
using System.Collections.ObjectModel;
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
    class TaskStore : ObservableCollection<TaskItem>
    {
        private IMobileServiceTable<TaskItem> todoTable = App.MobileService.GetTable<TaskItem>();

        public TaskStore()
        {
            Add(new TaskItem { Id = Guid.NewGuid().ToString(), Title = "Task 1" });
            Add(new TaskItem { Id = Guid.NewGuid().ToString(), Title = "Task 2" });
            User = null;
        }

        public MobileServiceUser User { get; set; }

        public async Task Create(TaskItem item)
        {
            item.Id = Guid.NewGuid().ToString();
            this.Add(item);
        }

        public async Task Update(TaskItem item)
        {
            for (var idx = 0; idx < this.Count; idx++)
            {
                if (this.Items[idx].Id.Equals(item.Id))
                {
                    this.Items[idx] = item;
                }
            }
        }

        public async Task Delete(TaskItem item)
        {
            this.Remove(item);
        }

    }
}

