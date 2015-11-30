import uuid from 'uuid';
/* global OData */

export default class Store {
    constructor() {
        console.info('Initializing Storage Manager');

        // We need to add the ZUMO-API-VERSION to the headers of the OData request
        this._defaultHttpClient = OData.defaultHttpClient;
        OData.defaultHttpClient = {
            request: (request, success, error) => {
                request.headers['ZUMO-API-VERSION'] = '2.0.0';
                this._defaultHttpClient.request(request, success, error);
            }
        };;

        this._service = 'https://ahall-todo-list.azurewebsites.net';
        this._store = `${this._service}/tables/TodoList`;
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
            /* odata.read(url, success(data,response), error(error), handler, httpClient, metadata); */

            var successFn = (data, response) => {
                console.info('[storage-manager] read data=', data);
                console.info('[storage-manager] read response=', response);
                resolve(data);
            };
            var errorFn = (error) => {
                console.error('[storage-manager] read error=', error);
                reject(error);
            };

            OData.read(this._store, successFn, errorFn);
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
