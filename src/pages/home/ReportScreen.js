import React from 'react';
import {withOnyx} from 'react-native-onyx';
import PropTypes from 'prop-types';
import {Keyboard, View} from 'react-native';
import _ from 'underscore';
import lodashGet from 'lodash/get';
import styles from '../../styles/styles';
import ScreenWrapper from '../../components/ScreenWrapper';
import HeaderView from './HeaderView';
import Navigation from '../../libs/Navigation/Navigation';
import ROUTES from '../../ROUTES';
import {handleInaccessibleReport, updateCurrentlyViewedReportID, addAction} from '../../libs/actions/Report';
import ONYXKEYS from '../../ONYXKEYS';

import ReportActionsView from './report/ReportActionsView';
import ReportActionCompose from './report/ReportActionCompose';
import KeyboardSpacer from '../../components/KeyboardSpacer';
import SwipeableView from '../../components/SwipeableView';
import CONST from '../../CONST';
import FullScreenLoadingIndicator from '../../components/FullscreenLoadingIndicator';
import ReportActionPropTypes from './report/ReportActionPropTypes';

const propTypes = {
    /** Navigation route context info provided by react navigation */
    route: PropTypes.shape({
        /** Route specific parameters used on this screen */
        params: PropTypes.shape({
            /** The ID of the report this screen should display */
            reportID: PropTypes.string,

            /** The ID of the report action to load.
             *  If present, we'll fetch one page before and after the report action, and render it in the center of the screen. */
            reportActionID: PropTypes.string,
        }).isRequired,
    }).isRequired,

    /** Tells us if the sidebar has rendered */
    isSidebarLoaded: PropTypes.bool,

    /** Whether or not to show the Compose Input */
    session: PropTypes.shape({
        shouldShowComposeInput: PropTypes.bool,
    }),

    /** The report currently being looked at */
    report: PropTypes.shape({
        /** Number of actions unread */
        unreadActionCount: PropTypes.number,

        /** The largest sequenceNumber on this report */
        maxSequenceNumber: PropTypes.number,

        /** The current position of the new marker */
        newMarkerSequenceNumber: PropTypes.number,

        /** Whether there is an outstanding amount in IOU */
        hasOutstandingIOU: PropTypes.bool,
    }),

    /** Array of report actions loaded for this report */
    reportActions: PropTypes.objectOf(PropTypes.shape(ReportActionPropTypes)),
};

const defaultProps = {
    isSidebarLoaded: false,
    session: {
        shouldShowComposeInput: true,
    },
    reportActions: {},
    report: {
        unreadActionCount: 0,
        maxSequenceNumber: 0,
        hasOutstandingIOU: false,
    },
};

/**
 * Get the currently viewed report ID as number
 *
 * @param {Object} route
 * @param {Object} route.params
 * @param {String} route.params.reportID
 * @returns {Number}
 */
function getReportID(route) {
    // TODO: move this to its own util
    return Number.parseInt(route.params.reportID, 10);
}

class ReportScreen extends React.Component {
    constructor(props) {
        super(props);

        this.onSubmitComment = this.onSubmitComment.bind(this);

        this.state = {
            isLoading: true,
        };
    }

    componentDidMount() {
        this.prepareTransition();
        this.storeCurrentlyViewedReport();
    }

    componentDidUpdate(prevProps) {
        if (this.props.route.params.reportID === prevProps.route.params.reportID) {
            return;
        }

        this.prepareTransition();
        this.storeCurrentlyViewedReport();
    }

    componentWillUnmount() {
        clearTimeout(this.loadingTimerId);
    }

    /**
     * @param {String} text
     */
    onSubmitComment(text) {
        addAction(getReportID(this.props.route), text);
    }

    /**
     * Find the sequence number of the reportAction with the reportActionID matching the one from the route param.
     *
     * @returns {Number}
     */
    getReportActionSequenceNumber() {
        // TODO: will this work if the linked-to reportAction is not loaded?
        return Number.parseInt(lodashGet(_.find(this.props.reportActions, reportAction => reportAction.reportActionID === this.props.route.params.reportActionID), 'sequenceNumber'), 10);
    }

    /**
     * When reports change there's a brief time content is not ready to be displayed
     *
     * @returns {Boolean}
     */
    shouldShowLoader() {
        return this.state.isLoading || !getReportID(this.props.route);
    }

    /**
     * Configures a small loading transition and proceeds with rendering available data
     */
    prepareTransition() {
        this.setState({isLoading: true});
        clearTimeout(this.loadingTimerId);
        this.loadingTimerId = setTimeout(() => this.setState({isLoading: false}), 0);
    }

    /**
     * Persists the currently viewed report id
     */
    storeCurrentlyViewedReport() {
        const reportID = getReportID(this.props.route);
        if (_.isNaN(reportID)) {
            handleInaccessibleReport();
            return;
        }
        updateCurrentlyViewedReportID(reportID);
    }

    render() {
        if (!this.props.isSidebarLoaded) {
            return null;
        }

        const reportID = getReportID(this.props.route);
        return (
            <ScreenWrapper style={[styles.appContent, styles.flex1]}>
                <HeaderView
                    reportID={reportID}
                    onNavigationMenuButtonClicked={() => Navigation.navigate(ROUTES.HOME)}
                />

                <View
                    nativeID={CONST.REPORT.DROP_NATIVE_ID}
                    style={[styles.flex1, styles.justifyContentEnd, styles.overflowHidden]}
                >
                    <FullScreenLoadingIndicator visible={this.shouldShowLoader()} />
                    {!this.shouldShowLoader() && (
                        <ReportActionsView
                            reportID={reportID}
                            reportActions={this.props.reportActions}
                            currentSequenceNumber={Number.parseInt(this.props.route.params.reportActionID, 10)}
                            report={this.props.report}
                            session={this.props.session}
                        />
                    )}
                    {this.props.session.shouldShowComposeInput && (
                        <SwipeableView onSwipeDown={() => Keyboard.dismiss()}>
                            <ReportActionCompose
                                onSubmit={this.onSubmitComment}
                                reportID={reportID}
                                reportActions={this.props.reportActions}
                                report={this.props.report}
                            />
                        </SwipeableView>
                    )}
                    <KeyboardSpacer />
                </View>
            </ScreenWrapper>
        );
    }
}

ReportScreen.propTypes = propTypes;
ReportScreen.defaultProps = defaultProps;

export default withOnyx({
    isSidebarLoaded: {
        key: ONYXKEYS.IS_SIDEBAR_LOADED,
    },
    session: {
        key: ONYXKEYS.SESSION,
    },
    reportActions: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${getReportID(route)}`,
        canEvict: false,
    },
    report: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.REPORT}${getReportID(route)}`,
    },
})(ReportScreen);
