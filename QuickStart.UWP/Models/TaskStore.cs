using Microsoft.WindowsAzure.MobileServices;
using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using Windows.UI.Popups;

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
        private IMobileServiceTable<TaskItem> tableController = App.MobileService.GetTable<TaskItem>();

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
            Add(item);
            if (User != null)
            {
                System.Diagnostics.Debug.WriteLine("Inserting item into remote table");
                await tableController.InsertAsync(item);
            }
        }

        public async Task Update(TaskItem item)
        {
            for (var idx = 0; idx < Count; idx++)
            {
                if (Items[idx].Id.Equals(item.Id))
                {
                    Items[idx] = item;
                }
            }
            if (User != null)
            {
                System.Diagnostics.Debug.WriteLine("Updating item in remote table");
                await tableController.UpdateAsync(item);
            }
        }

        public async Task Delete(TaskItem item)
        {
            Remove(item);
            if (User != null)
            {
                System.Diagnostics.Debug.WriteLine("Deleting item in remote table");
                await tableController.DeleteAsync(item);
            }
        }

        public async Task Refresh()
        {
            try
            {
                System.Diagnostics.Debug.WriteLine("Refreshing from the remote table");
                var items = await tableController.ToCollectionAsync();
                Clear();
                var e = items.GetEnumerator();
                while (e.MoveNext())
                {
                    Add(e.Current);
                }
            }
            catch (MobileServiceInvalidOperationException ex)
            {
                System.Diagnostics.Debug.WriteLine(String.Format("Cannot read from remote table: {0}", ex.Message));
                await new MessageDialog(ex.Message, "Error loading itmes").ShowAsync();
            }
        }
    }
}

