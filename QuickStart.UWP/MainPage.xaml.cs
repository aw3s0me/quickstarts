using Microsoft.WindowsAzure.MobileServices;
using QuickStart.UWP.Models;
using System;
using Windows.UI.Popups;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Navigation;

namespace QuickStart.UWP
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        private TaskStore store;
        private FilteredTaskStore filteredStore;
        private MobileServiceUser user = null;

        public MainPage()
        {
            store = new TaskStore();
            filteredStore = new FilteredTaskStore(store);
            this.InitializeComponent();

            SizeChanged += MainPage_SizeChanged;
            tasksListView.ItemsSource = store;

            // Set up the defaults for filtering by the store definition
            IncludeCompletedCheckbox.IsChecked = filteredStore.IncludeCompletedItems;
        }

        /// <summary>
        /// Event handler - called when the device or window size
        /// is changed.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void MainPage_SizeChanged(object sender, SizeChangedEventArgs e)
        {
            var state = "Normal";
            if (e.NewSize.Width < 600 || e.NewSize.Height < 600)
            {
                state = "Narrow";
            }
            VisualStateManager.GoToState(this, state, true);
        }

        /// <summary>
        /// Refresh the contents of the list when the page is loaded
        /// </summary>
        /// <param name="e"></param>
        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            filteredStore.RefreshView();
        }

        /// <summary>
        /// Event handler that is called when a checkbox is set or cleared
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private async void CheckBoxComplete_Checked(object sender, RoutedEventArgs e)
        {
            CheckBox checkbox = (CheckBox)sender;
            TaskItem item = checkbox.DataContext as TaskItem;
            item.Completed = (bool)checkbox.IsChecked;
            await filteredStore.Update(item);
        }

        /// <summary>
        /// Event handler that processes the new task when the Save button is clicked
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private async void SaveTaskButton_Click(object sender, RoutedEventArgs e)
        {
            await filteredStore.Create(new TaskItem { Title = NewTaskContent.Text.Trim() });
            NewTaskContent.Text = "";
        }

        /// <summary>
        /// Event handler that processes the new task when data is entered in the field.
        /// In this case, it works out if the save button should be clickable or not.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void NewTaskContent_TextChanged(object sender, TextChangedEventArgs e)
        {
            TextBox box = (TextBox)sender;
            SaveTaskButton.IsEnabled = (box.Text.Trim().Length > 0);
        }

        /// <summary>
        /// Event handler that processes the filter options - only one right now for the
        /// Include Completed Tasks
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void FilterCompletedTasks_Clicked(object sender, RoutedEventArgs e)
        {
            var includeCompleted = (bool)((CheckBox)sender).IsChecked;
            filteredStore.IncludeCompletedItems = includeCompleted;
        }

        private void SortTasks_Clicked(object sender, RoutedEventArgs e)
        {
            var b = ((RadioButton)sender).Name.Replace("SortMethod_","");
            filteredStore.SortMethod = (b.Equals("Unsorted")) ? null : b;
        }

        /// <summary>
        /// Event Handler, called when the Sync button (which could be a Login or Sync)
        /// is called.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private async void LoginSync_Clicked(object sender, RoutedEventArgs e)
        {
            if (user == null)
            {
                try
                {
                    user = await App.MobileService.LoginAsync(MobileServiceAuthenticationProvider.MicrosoftAccount);
                    System.Diagnostics.Debug.WriteLine("User is logged in");
                }
                catch (MobileServiceInvalidOperationException ex)
                {
                    System.Diagnostics.Debug.WriteLine(String.Format("Mobile Services Error: {0}", ex.Message));
                    user = null;
                    var dialog = new MessageDialog(ex.Message);
                    dialog.Commands.Add(new UICommand("OK"));
                    await dialog.ShowAsync();
                }
            }
            else
            {
                // Sync Action
                System.Diagnostics.Debug.WriteLine("MobileServices Sync");
            }
        }
    }
}
