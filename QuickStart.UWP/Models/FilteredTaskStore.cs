using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Linq;
using System.Threading.Tasks;

namespace QuickStart.UWP.Models
{
    /// <summary>
    /// A filtered version of the task store.
    /// </summary>
    class FilteredTaskStore : INotifyCollectionChanged, IList
    {
        private TaskStore _store;
        private List<TaskItem> _view;
        private bool _filterCompleted = true;
        private string _sortMethod = null;

        /// <summary>
        /// Create a new FilteredTaskStore based on an existing TaskStore
        /// </summary>
        /// <param name="store">The TaskStore to base this filter on</param>
        public FilteredTaskStore(TaskStore store)
        {
            _store = store;
            _view = new List<TaskItem>(this._store);
        }

        public bool IncludeCompletedItems
        {
            get
            {
                return _filterCompleted;
            }
            set
            {
                _filterCompleted = value;
                RefreshView();
            }
        }

        public string SortMethod
        {
            get
            {
                return _sortMethod;
            }
            set
            {
                _sortMethod = value;
                RefreshView();
            }
        }

        #region IList Interface
        public object this[int index]
        {
            get
            {
                return _view[index];
            }
            set
            {
                throw new InvalidOperationException();
            }
        }

        public int Count
        {
            get
            {
                return _view.Count;
            }
        }

        public bool IsFixedSize
        {
            get
            {
                return ((IList)_view).IsFixedSize;
            }
        }

        public bool IsReadOnly
        {
            get
            {
                return ((IList)_view).IsReadOnly;
            }
        }

        public bool IsSynchronized
        {
            get
            {
                return ((IList)_view).IsSynchronized;
            }
        }

        public object SyncRoot
        {
            get
            {
                return ((IList)_view).SyncRoot;
            }
        }

        public event NotifyCollectionChangedEventHandler CollectionChanged;

        public int Add(object value)
        {
            return ((IList)_view).Add(value);
        }

        public void Clear()
        {
            ((IList)_view).Clear();
        }

        public bool Contains(object value)
        {
            return ((IList)_view).Contains(value);
        }

        public void CopyTo(Array array, int index)
        {
            ((IList)_view).CopyTo(array, index);
        }

        public IEnumerator GetEnumerator()
        {
            return ((IList)_view).GetEnumerator();
        }

        public int IndexOf(object value)
        {
            return ((IList)_view).IndexOf(value);
        }

        public void Insert(int index, object value)
        {
            ((IList)_view).Insert(index, value);
        }

        public void Remove(object value)
        {
            ((IList)_view).Remove(value);
        }

        public void RemoveAt(int index)
        {
            ((IList)_view).RemoveAt(index);
        }
        #endregion

        #region TaskStore interface
        /// <summary>
        /// Create a new Task asynchronously
        /// </summary>
        /// <param name="item"></param>
        /// <returns></returns>
        public async Task Create(TaskItem item)
        {
            await _store.Create(item);
            RefreshView();
        }

        /// <summary>
        /// Update a task asynchronously
        /// </summary>
        /// <param name="item"></param>
        /// <returns></returns>
        public async Task Update(TaskItem item)
        {
            await _store.Update(item);
            RefreshView();
        }

        /// <summary>
        /// Delete a task asynchronously
        /// </summary>
        /// <param name="item"></param>
        /// <returns></returns>
        public async Task Delete(TaskItem item)
        {
            await _store.Delete(item);
            RefreshView();
        }

        /// <summary>
        /// Refresh the store
        /// </summary>
        /// <returns></returns>
        public async Task Refresh()
        {
            await _store.Refresh();
            RefreshView();
        }
        #endregion

        /// <summary>
        /// Refresh the view, based on filters and sorting mechanisms.
        /// </summary>
        public void RefreshView()
        {
            var oldItems = _view.ToArray();

            var tasks = _store.Where(task => IncludeCompletedItems || !task.Completed);
            if (SortMethod != null)
            {
                if (SortMethod.Equals("ByTitle"))
                {
                    tasks = tasks.OrderBy(t => t.Title);
                }
            }

            _view.Clear();
            _view.AddRange(tasks);
            if (CollectionChanged != null)
            {
                // Call the event handler for the updated list.
                CollectionChanged(this, new NotifyCollectionChangedEventArgs(NotifyCollectionChangedAction.Reset));
            }
        }

    }
}
