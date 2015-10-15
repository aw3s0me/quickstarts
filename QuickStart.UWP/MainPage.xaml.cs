using QuickStart.UWP.Models;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Navigation;

namespace QuickStart.UWP
{
    enum SortMethod
    {
        Unsorted,
        ByTitle
    }

    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        private TaskStore store;
        private bool includeCompleted = false;
        private SortMethod sortMethod = SortMethod.Unsorted;

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
            ListItems.ItemsSource = store;
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
            await store.Update(item);
        }

        /// <summary>
        /// Event handler that processes the new task when the Save button is clicked
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private async void SaveTaskButton_Click(object sender, RoutedEventArgs e)
        {
            await store.Create(new TaskItem { Title = NewTaskContent.Text.Trim() });
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
        /// Event Handler that processes the Include Completed checkbox
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void IncludeCompletedCheckbox_Changed(object sender, RoutedEventArgs e)
        {
            this.includeCompleted = (bool)((CheckBox)sender).IsChecked;
            System.Diagnostics.Debug.WriteLine(string.Format("Include Completed = {0}", this.includeCompleted));
        }

        private void SortMethod_Changed(object sender, RoutedEventArgs e)
        {
            var item = (RadioButton)sender;
            if (item.Name.Equals("SortMethod_Unsorted"))
            {
                this.sortMethod = SortMethod.Unsorted;
            }
            else if (item.Name.Equals("SortMethod_ByTitle"))
            {
                this.sortMethod = SortMethod.ByTitle;
            }
            System.Diagnostics.Debug.WriteLine(string.Format("Sort Method = {0}", this.sortMethod));
        }
    }
}
