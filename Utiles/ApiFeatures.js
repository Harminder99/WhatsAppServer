class ApiFeatures {
  constructor(queryModel, queryRequest) {
    this.queryModel = queryModel;
    this.queryRequest = queryRequest;
  }
  async fetchExe(obj) {
    let queryStr = JSON.stringify(this.queryRequest);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    const queryObj = JSON.parse(queryStr);
    const fields = queryObj.fields
      ? queryObj.fields.split(",").join(" ")
      : "-__v";
    const page = this.queryRequest.page * 1 || 1;
    const limit = this.queryRequest.limit * 1 || 10;
    const skip = (page - 1) * limit;

    // Create the query for fetching documents
    let findQuery = this.queryModel.find(obj);

    // Apply skip, limit, field selection, and sorting to the query
    findQuery = findQuery
      .skip(skip)
      .limit(limit)
      .select(fields)
      .sort(this.queryRequest.sort);

    // Execute the query to get the paginated results
    const results = await findQuery;

    // Use the same 'obj' query to count documents
    const totalResults = await this.queryModel.countDocuments(obj);

    return {
      results: results,
      skip: skip,
      page: page,
      totalResults: totalResults,
    };
  }

  async fetchAgriExe(geoQuery, interestQuery, user) {
    let queryStr = JSON.stringify(this.queryRequest);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    const queryObj = JSON.parse(queryStr);

    const fieldsString = queryObj.fields
      ? queryObj.fields.split(",").join(" ")
      : "-__v";
    const fieldsArray = fieldsString.split(" ");
    let fieldsObject = {};
    fieldsArray.forEach((field) => {
      if (field.startsWith("-")) {
        fieldsObject[field.substring(1)] = 0;
      } else {
        fieldsObject[field] = 1;
      }
    });

    // Exclude password field
    fieldsObject.password = 0;

    const page = this.queryRequest.page * 1 || 1;
    const limit = this.queryRequest.limit * 1 || 10;
    const skip = (page - 1) * limit;

    let pipeline = [];

    // If a geospatial query is provided, add it as the first stage
    if (geoQuery) {
      pipeline.push(geoQuery);
    }
    // Add a $match stage for interests if provided
    console.log("ExcludeID ==> ", user._id);
    if (interestQuery && interestQuery.length > 0) {
      pipeline.push({
        $match: {
          interest: { $in: interestQuery },
          _id: { $ne: user._id },
        },
      });
    } else {
      pipeline.push({
        $match: {
          _id: { $ne: user._id },
        },
      });
    }
    // other queries
    pipeline.push(
      { $skip: skip },
      { $limit: limit },
      { $project: fieldsObject }
    );
    // Add other stages to the pipeline
    if (this.queryRequest?.sort) {
      pipeline.push({ $sort: this.queryRequest?.sort });
    }

    const results = await this.queryModel.aggregate(pipeline);
    const totalResults = await this.queryModel.countDocuments();

    return {
      results: results,
      skip: skip,
      page: page,
      totalResults: totalResults,
    };
  }
}

module.exports = ApiFeatures;
