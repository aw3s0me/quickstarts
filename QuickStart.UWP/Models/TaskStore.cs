using Microsoft.WindowsAzure.MobileServices;
using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using Windows.UI.Popups;

// Offline Sync Requirements
using Microsoft.WindowsAzure.MobileServices.SQLiteStore;
using Microsoft.WindowsAzure.MobileServices.Sync;

namespace QuickStart.UWP.Models
{
    /// <summary>
    /// Implementation of the TaskStore - this is a basic
    /// CRUD type store.
    /// </summary>
    class TaskStore : ObservableCollection<TaskItem>
    {
        private IMobileServiceSyncTable<TaskItem> tableController = App.MobileService.GetSyncTable<TaskItem>();

        public TaskStore()
        {
            Add(new TaskItem { Id = Guid.NewGuid().ToString(), Title = "Task 1" });
            Add(new TaskItem { Id = Guid.NewGuid().ToString(), Title = "Task 2" });
            User = null;
        }

        public MobileServiceUser User { get; set; }

        private async Task SynchronizeStoreAsync()
        {
            if (!App.MobileService.SyncContext.IsInitialized)
            {
                System.Diagnostics.Debug.WriteLine("Creating local cache context");
                var store = new MobileServiceSQLiteStore("taskstore.db");
                store.DefineTable<TaskItem>();
                await App.MobileService.SyncContext.InitializeAsync(store);
            }
            System.Diagnostics.Debug.WriteLine("Pushing changes to remote server");
            await App.MobileService.SyncContext.PushAsync();
            System.Diagnostics.Debug.WriteLine("Pulling changes from remote server");
            await tableController.PullAsync("taskItems", tableController.CreateQuery());
        }

        public async Task Create(TaskItem item)
        {
            item.Id = Guid.NewGuid().ToString();
            Add(item);
            if (User != null)
            {
                System.Diagnostics.Debug.WriteLine("Inserting item into remote table");
                await tableController.InsertAsync(item);
                await SynchronizeStoreAsync();
                System.Diagnostics.Debug.WriteLine("Inserted item into remote table");
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
                await SynchronizeStoreAsync();
                System.Diagnostics.Debug.WriteLine("Updated item in remote table");
            }
        }

        public async Task Delete(TaskItem item)
        {
            Remove(item);
            if (User != null)
            {
                System.Diagnostics.Debug.WriteLine("Deleting item in remote table");
                await tableController.DeleteAsync(item);
                await SynchronizeStoreAsync();
                System.Diagnostics.Debug.WriteLine("Deleted item in remote table");
            }
        }

        public async Task Refresh()
        {
            try
            {
                System.Diagnostics.Debug.WriteLine("Refreshing local cache from the remote table");
                await SynchronizeStoreAsync();
                System.Diagnostics.Debug.WriteLine("Refreshing local data structure from local cache");
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

