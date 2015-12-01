import uuid from 'uuid';

export default class Store {
    constructor() {
        console.info('Initializing Storage Manager');

        this._data = [];
    }



    /**
     * Read some records based on the query.  The elements must match
     * the query
     * @method read
     * @param {object} query the things to match
     * @return {Promise} - resolve(items), reject(error)
     */
    read(query) {
        console.log('[storage-manager] read query=', query);

        var promise = new Promise((resolve, reject) => {
            var filteredData = this._data.filter((element, index, array) => {
                for (let q in query) {
                    if (query[q] !== element[q]) {
                        return false;
                    }
                }
                return true;
            });
            resolve(filteredData);
        });
        return promise;
    }

    /**
     * Insert a new object into the database.
     * @method insert
     * @param {object} data the data to insert
     * @return {Promise} - resolve(newitem), reject(error)
     */
    insert(data) {
        data.id = uuid.v1();
        console.log('[storage-manager] insert data=', data);
        var promise = new Promise((resolve, reject) => {
            // This promise always resolves
            this._data.push(data);
            resolve(data);
        });

        return promise;
    }

    /**
     * Fetches a record by ID
     * @method get
     * @param {string} id the ID to retrieve
     * @return {Promise} - resolve(item), reject(error)
     */
    getById(id) {
        console.log('[storage-manager] get id=', id);
        var promise = new Promise((resolve, reject) => {
            this._data.forEach((element) => {
                if (element.id === id) {
                    resolve(element);
                }
            });
            reject(new Error('Cannot find ID: ' + id));
        });
        return promise;
    }

    /**
     * Update a record
     * @method update
     * @param {Object} data the object to update
     * @return {Promise} - resolve(item), reject(error)
     */
    update(data) {
        console.log('[storage-manager] update data=', data);
        var promise = new Promise((resolve, reject) => {
            for (let i = 0 ; i < this._data.length ; i++) {
                if (this._data[i].id === data.id) {
                    this._data[i] = data;
                    resolve(data);
                }
            }
            reject(new Error('Cannot find ID: ' + data[id]));
        });
        return promise;
    }
};
