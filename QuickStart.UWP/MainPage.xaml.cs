using QuickStart.UWP.Data;
using QuickStart.UWP.Models;
using System;
using System.IO;
using Windows.UI;
using Windows.UI.Popups;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

namespace QuickStart.UWP
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        private DataTable<TaskItem> taskTable = new DataTable<TaskItem>();

        public MainPage()
        {
            this.InitializeComponent();

            SizeChanged += MainPage_SizeChanged;

            // Associate the task table with the items-source
            tasksListView.ItemsSource = taskTable;
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
        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            await taskTable.RefreshAsync();
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

            await taskTable.UpdateAsync(item);
        }

        /// <summary>
        /// Event handler that processes the new task when the Save button is clicked
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private async void SaveTaskButton_Click(object sender, RoutedEventArgs e)
        {
            await taskTable.CreateAsync(new TaskItem {
                Id = Guid.NewGuid().ToString(),
                Title = NewTaskContent.Text.Trim()
            });

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
        /// Event Handler, called when the Sync button (which could be a Login or Sync)
        /// is called.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private async void LoginSync_Clicked(object sender, RoutedEventArgs e)
        {
            var dataStore = await DataStore.GetInstance();

            if (!dataStore.IsAuthenticated)
            {
                try
                {
                    await dataStore.AuthenticateAsync();
                    if (dataStore.IsAuthenticated)
                    {
                        loginSyncButton.Label = "Sync";
                    }
                }
                catch (LoginDeniedException)
                {
                    var dialog = new MessageDialog("Login Failed");
                    dialog.Commands.Add(new UICommand("OK"));
                    await dialog.ShowAsync();
                    return;
                }
                catch (Exception)
                {
                    var dialog = new MessageDialog("Authentication not configured on backend");
                    dialog.Commands.Add(new UICommand("OK"));
                    await dialog.ShowAsync();
                    return;
                }
            }

            // We are authenticated
            // Turn the Sync green and disable it
            var oldForeground = loginSyncButton.Foreground;
            loginSyncButton.IsEnabled = false;
            // Do the sync
            try
            {
                await taskTable.RefreshAsync();
            }
            catch (Exception ex)
            {
                var dialog = new MessageDialog(String.Format("Refresh from Cloud failed:\n{0}", ex.Message));
                dialog.Commands.Add(new UICommand("OK"));
                await dialog.ShowAsync();
                return;
            }
            // Re-enable the sync button
            loginSyncButton.IsEnabled = true;
        }
    }
}
