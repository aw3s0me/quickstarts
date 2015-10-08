using Microsoft.WindowsAzure.MobileServices;
using QuickStart.DataModel;
using System;
using System.Threading.Tasks;
using Windows.UI.Popups;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Navigation;

namespace QuickStart
{
    public sealed partial class MainPage : Page
    {
        private MobileServiceCollection<TodoItem, TodoItem> items;
        private IMobileServiceTable<TodoItem> todoTable = App.MobileService.GetTable<TodoItem>();

        public MainPage()
        {
            this.InitializeComponent();
        }

        /// <summary>
        /// Insert a new TodoItem into the local database.  When the operation completes and Mobile
        /// Services has assigned an Id, the item is added to the CollectionView
        /// </summary>
        /// <param name="todoItem">The new Task</param>
        /// <returns></returns>
        private async Task InsertTodoItem(TodoItem todoItem)
        {
            await todoTable.InsertAsync(todoItem);
            items.Add(todoItem);
        }

        /// <summary>
        /// Refresh the entries in the list view by querying the TodoItems table.
        /// </summary>
        /// <returns></returns>
        private async Task RefreshTodoItems()
        {
            MobileServiceInvalidOperationException exception = null;

            try
            {
                items = await todoTable
                    .Where(todoItem => todoItem.Complete == false)
                    .ToCollectionAsync();
            }
            catch (MobileServiceInvalidOperationException e)
            {
                // TODO: Why isn't the exception processing below inside the exception handler code?
                exception = e;
            }

            if (exception != null)
            {
                await new MessageDialog(exception.Message, "Error loading items").ShowAsync();
            }
            else
            {
                ListItems.ItemsSource = items;
                this.ButtonSave.IsEnabled = true;
            }
        }

        /// <summary>
        /// Takes a freshly completed TodoItem and updates the database.  When the Mobile Service responds,
        /// the item is removed from the list.
        /// </summary>
        /// <param name="item">The item to be marked completed</param>
        /// <returns></returns>
        private async Task UpdateCheckedTodoItem(TodoItem item)
        {
            await todoTable.UpdateAsync(item);
            items.Remove(item);
            ListItems.Focus(FocusState.Unfocused);
        }

        /// <summary>
        /// Event Handler - invoked when the page is loaded and becomes the current source of a parent Frame.
        /// </summary>
        /// <param name="e">The Event</param>
        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            await RefreshTodoItems();
        }

        #region UI Event Handlers
        /// <summary>
        /// Event handler for the Save Button
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private async void ButtonSave_Clicked(object sender, RoutedEventArgs e)
        {
            var todoItem = new TodoItem { Text = TextInput.Text };
            await InsertTodoItem(todoItem);
        }

        /// <summary>
        /// Event Handler for the Refresh button
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private async void ButtonRefresh_Clicked(object sender, RoutedEventArgs e)
        {
            ButtonRefresh.IsEnabled = false;
            await RefreshTodoItems();
            ButtonRefresh.IsEnabled = true;
        }

        private async void CompletedCheckBox_Checked(object sender, RoutedEventArgs e)
        {
            CheckBox cb = (CheckBox)sender;
            TodoItem item = cb.DataContext as TodoItem;
            await UpdateCheckedTodoItem(item);
        }
        #endregion
    }
}
