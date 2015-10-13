using QuickStart.UWP.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
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

        public MainPage()
        {
            store = new TaskStore();
            this.InitializeComponent();
            SizeChanged += MainPage_SizeChanged;
        }

        /// <summary>
        /// Event handler - called when the device or window size
        /// is changed.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void MainPage_SizeChanged(object sender, SizeChangedEventArgs e) {
          var state = "Normal";
            if (e.NewSize.Width < 600 || e.NewSize.Height < 600)
            {
                state = "Narrow";
            }
            VisualStateManager.GoToState(this, state, true);
        }

        /// <summary>
        /// Refresh the items in the list.
        /// </summary>
        private async Task RefreshItems()
        {
            try
            {
                ListItems.ItemsSource = (List<TaskItem>)(await store.RetrieveTaskItems());
            }
            catch (Exception ex)
            {
                await new MessageDialog(ex.Message, "Error loading tasks").ShowAsync();
            }
        }

        /// <summary>
        /// Refresh the contents of the list when the page is loaded
        /// </summary>
        /// <param name="e"></param>
        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            await RefreshItems();
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
            await store.UpdateTaskItem(item);
            await RefreshItems();
        }
    }
}
